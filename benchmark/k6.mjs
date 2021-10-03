import { check, fail } from 'k6';
import ws from 'k6/ws';
import { Counter, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.0.0/index.js';
import { ports } from './servers/ports.mjs';
import { MessageType } from '../lib/common.mjs';

if (!__ENV.SERVER) {
  throw new Error('SERVER not specified.');
}

export const options = {
  scenarios: {
    query: {
      executor: 'constant-vus',
      exec: 'run',
      vus: 10,
    },
    subscription: {
      executor: 'constant-vus',
      exec: 'run',
      vus: 10,

      env: { SUBSCRIPTION: '1' },
    },
  },
};

const duration = 5, // seconds
  gracefulStop = 5; // seconds
let i = 0;
for (const [, scenario] of Object.entries(options.scenarios)) {
  i++;

  scenario.duration = duration + 's';
  scenario.gracefulStop = gracefulStop + 's';
  if (i > 1) {
    scenario.startTime = (duration + gracefulStop) * (i - 1) + 's';
  }
}

const scenarioMetrics = {};
for (let scenario in options.scenarios) {
  if (!options.scenarios[scenario].env) options.scenarios[scenario].env = {};
  options.scenarios[scenario].env['SCENARIO'] = scenario;
  if (!options.scenarios[scenario].tags) options.scenarios[scenario].tags = {};
  options.scenarios[scenario].tags['SCENARIO'] = scenario;

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

  let completed = false;
  try {
    ws.connect(
      `ws://localhost:${ports[__ENV.SERVER]}/graphql`,
      {
        headers: {
          'Sec-WebSocket-Protocol': __ENV.LEGACY
            ? 'graphql-ws'
            : 'graphql-transport-ws',
        },
      },
      function (socket) {
        // each run's socket can be open for no more than 3 seconds
        socket.setTimeout(() => socket.close(), 3000);

        socket.on('close', (code) => {
          if (code !== 1000) throw null;
        });

        socket.on('open', () => {
          metrics.opened.add(Date.now() - start);

          socket.send(
            JSON.stringify({
              type: __ENV.LEGACY
                ? 'connection_init'
                : MessageType.ConnectionInit,
            }),
          );
        });

        let msgs = 0;
        socket.on('message', (data) => {
          msgs++;

          if (msgs === 1) {
            assertMessageType(
              JSON.parse(data).type,
              __ENV.LEGACY ? 'connection_ack' : MessageType.ConnectionAck,
            );

            socket.send(
              JSON.stringify({
                type: __ENV.LEGACY ? 'start' : MessageType.Subscribe,
                id: uuidv4(),
                payload: {
                  query: __ENV.SUBSCRIPTION
                    ? 'subscription { greetings }'
                    : '{ hello }',
                },
              }),
            );

            metrics.subscribed.add(Date.now() - start);
          } else if (__ENV.SUBSCRIPTION ? msgs > 1 && msgs <= 6 : msgs === 2) {
            assertMessageType(
              JSON.parse(data).type,
              __ENV.LEGACY ? 'data' : MessageType.Next,
            );
          } else if (__ENV.SUBSCRIPTION ? msgs > 6 : msgs === 3) {
            assertMessageType(
              JSON.parse(data).type,
              __ENV.LEGACY ? 'complete' : MessageType.Complete,
            );

            // we're done once completed
            socket.close(1000);
          } else fail(`Shouldn't have msgs ${msgs} messages`);
        });
      },
    );
    completed = true;
    metrics.completed.add(Date.now() - start);
    metrics.completions.add(1);
  } catch (_err) {
    // noop
  }
  check(0, { [`${__ENV.SCENARIO} - completed`]: () => completed });
}

function assertMessageType(got, expected) {
  if (got !== expected) {
    fail(`Expected ${expected} message, got ${got}`);
  }
}
