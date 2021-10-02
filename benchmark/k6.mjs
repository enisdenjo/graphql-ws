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
      gracefulStop: '5s',

      env: { PORT: String(WS_PORT) },
    },
    uWebSockets: {
      startTime: '10s', // after ws

      executor: 'constant-vus',
      exec: 'run',
      vus: 10,
      duration: '5s',
      gracefulStop: '5s',

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
    opened: new Trend(`${scenario}/opened`, true),
    acknowledged_and_subscribed: new Trend(
      `${scenario}/acknowledged_and_subscribed`,
      true,
    ),
    next_received: new Trend(`${scenario}/next_received`, true),
    complete_received: new Trend(`${scenario}/complete_received`, true),
    closed: new Trend(`${scenario}/closed`, true),
    total: new Trend(`${scenario}/total`, true),
  };
}

export function run() {
  const start = Date.now();
  let opened = 0;
  let acknowledged_and_subscribed = 0;
  let next_received = 0;
  let complete_received = 0;

  const metrics = scenarioMetrics[__ENV.SCENARIO];
  metrics.run.add(1);

  const res = ws.connect(
    `ws://localhost:${__ENV.PORT}/graphql`,
    { headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' } },
    function (socket) {
      // each run's socket can be open for no more than 3 seconds
      socket.setTimeout(() => socket.close(), 3000);

      socket.on('close', (code) => {
        check(code, {
          'closed normally': (code) => code === 1000,
        });
        metrics.closed.add(Date.now() - start);
      });

      socket.on('open', () => {
        opened = Date.now() - start;
        metrics.opened.add(opened);

        socket.send(stringifyMessage({ type: MessageType.ConnectionInit }));
      });

      let msgs = 0;
      socket.on('message', (data) => {
        msgs++;

        if (msgs === 1) {
          check(data, {
            'connection acknowledged': (data) =>
              parseMessage(data).type === MessageType.ConnectionAck,
          });

          // execute query once acknowledged_and_subscribed
          socket.send(
            stringifyMessage({
              type: MessageType.Subscribe,
              id: 'k6',
              payload: { query: '{ hello }' },
            }),
          );

          acknowledged_and_subscribed = Date.now() - opened;
          metrics.acknowledged_and_subscribed.add(acknowledged_and_subscribed);
        } else if (msgs === 2) {
          check(data, {
            'next message received': (data) =>
              parseMessage(data).type === MessageType.Next,
          });

          next_received = Date.now() - acknowledged_and_subscribed;
          metrics.next_received.add(next_received);
        } else if (msgs === 3) {
          check(data, {
            'complete message received': (data) =>
              parseMessage(data).type === MessageType.Complete,
          });
          complete_received = Date.now() - next_received;
          metrics.complete_received.add(complete_received);

          // we're done once completed
          socket.close(1000);
        } else fail(`Shouldn't have msgs ${msgs} messages`);
      });
    },
  );

  metrics.total.add(Date.now() - start);
  check(res, { 'status was 101': (r) => r && r.status === 101 });
}
