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

const scenarioMetrics = {};
for (let scenario in options.scenarios) {
  options.scenarios[scenario].env['SCENARIO'] = scenario;
  options.scenarios[scenario].tags = { ['SCENARIO']: scenario };

  scenarioMetrics[scenario] = {
    runs: new Counter(`${scenario} - runs`),
    opened: new Trend(`${scenario} - opened`, true),
    subscribed: new Trend(`${scenario} - subscribed`, true),
    completions: new Counter(`${scenario} - completions`),
    completed: new Trend(`${scenario} - completed`, true),
  };
}

export function run() {
  const start = Date.now();

  const metrics = scenarioMetrics[__ENV.SCENARIO];
  metrics.runs.add(1);

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
      });

      socket.on('open', () => {
        metrics.opened.add(Date.now() - start);

        socket.send(stringifyMessage({ type: MessageType.ConnectionInit }));
      });

      let msgs = 0;
      socket.on('message', (data) => {
        msgs++;

        if (msgs === 1) {
          assertMessageType(parseMessage(data).type, MessageType.ConnectionAck);

          socket.send(
            stringifyMessage({
              type: MessageType.Subscribe,
              id: 'k6',
              payload: { query: '{ hello }' },
            }),
          );

          metrics.subscribed.add(Date.now() - start);
        } else if (msgs === 2)
          assertMessageType(parseMessage(data).type, MessageType.Next);
        else if (msgs === 3) {
          assertMessageType(parseMessage(data).type, MessageType.Complete);

          // we're done once completed
          socket.close(1000);
        } else fail(`Shouldn't have msgs ${msgs} messages`);
      });
    },
  );

  metrics.completed.add(Date.now() - start);
  metrics.completions.add(1);
}

function assertMessageType(got, expected) {
  if (got !== expected) {
    fail(`Expected ${expected} message, got ${got}`);
  }
}