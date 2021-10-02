import { check, fail } from 'k6';
import ws from 'k6/ws';
import { Counter, Trend } from 'k6/metrics';
import { WS_PORT, UWS_PORT } from './servers/ports.mjs';
import { stringifyMessage, parseMessage, MessageType } from '../lib/common.mjs';

export const options = {
  scenarios: {
    ws: {
      executor: 'constant-vus',
      exec: 'run',
      vus: 10,
      duration: '5s',
      gracefulStop: '3s',

      env: { PORT: String(WS_PORT) },
    },
    uWebSockets: {
      startTime: '8s', // after ws

      executor: 'constant-vus',
      exec: 'run',
      vus: 10,
      duration: '5s',
      gracefulStop: '3s',

      env: { PORT: String(UWS_PORT) },
    },
  },
};

// assemble metrics per scenario
const scenarioMetrics = {};
for (let scenario in options.scenarios) {
  options.scenarios[scenario].env['SCENARIO'] = scenario;

  scenarioMetrics[scenario] = {
    run: new Counter(`${scenario}/run`),
    acknowledged: new Trend(`${scenario}/acknowledged`, true),
    next_received: new Trend(`${scenario}/next_received`, true),
    complete_received: new Trend(`${scenario}/complete_received`, true),
    closed: new Trend(`${scenario}/closed`, true),
  };
}

export function run() {
  const start = Date.now();

  const metrics = scenarioMetrics[__ENV.SCENARIO];
  metrics.run.add(1);

  const res = ws.connect(
    `ws://localhost:${__ENV.PORT}/graphql`,
    { headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' } },
    function (socket) {
      // each run's socket can be open for no more than 5 seconds
      socket.setTimeout(() => socket.close(), 5000);

      socket.on('close', (code) => {
        check(code, {
          'closed normally': (code) => code === 1000,
        });
        metrics.closed.add(Date.now() - start);
      });

      socket.on('open', () =>
        socket.send(stringifyMessage({ type: MessageType.ConnectionInit })),
      );

      let msgs = 0;
      socket.on('message', (data) => {
        msgs++;

        if (msgs === 1) {
          check(data, {
            'connection acknowledged': (data) =>
              parseMessage(data).type === MessageType.ConnectionAck,
          });
          metrics.acknowledged.add(Date.now() - start);

          // execute query once acknowledged
          socket.send(
            stringifyMessage({
              type: MessageType.Subscribe,
              id: 'k6',
              payload: { query: '{ hello }' },
            }),
          );
        } else if (msgs === 2) {
          check(data, {
            'next message received': (data) =>
              parseMessage(data).type === MessageType.Next,
          });
          metrics.next_received.add(Date.now() - start);
        } else if (msgs === 3) {
          check(data, {
            'complete message received': (data) =>
              parseMessage(data).type === MessageType.Complete,
          });
          metrics.complete_received.add(Date.now() - start);

          // we're done once completed
          socket.close(1000);
        } else fail(`Shouldn't have msgs ${msgs} messages`);
      });
    },
  );

  check(res, { 'status was 101': (r) => r && r.status === 101 });
}
