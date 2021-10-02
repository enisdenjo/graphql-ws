import { check, fail } from 'k6';
import ws from 'k6/ws';
import { Trend } from 'k6/metrics';
import { WS_PORT } from './servers/ports.mjs';
import { stringifyMessage, parseMessage, MessageType } from '../lib/common.mjs';

const trace = {
  ws_graphql_ack: new Trend('ws_graphql_ack', true),
  ws_graphql_next: new Trend('ws_graphql_next', true),
  ws_graphql_complete: new Trend('ws_graphql_complete', true),
  ws_graphql_close: new Trend('ws_graphql_close', true),
};

export let options = {
  scenarios: {
    ws: {
      exec: 'run',
      gracefulStop: '5s',

      executor: 'constant-vus',
      vus: 10,
      duration: '5s',

      env: { PORT: String(WS_PORT) },
    },
  },
};

export function run() {
  const start = Date.now();

  const res = ws.connect(
    `ws://localhost:${__ENV.PORT}/graphql`,
    { headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' } },
    function (socket) {
      // each run's socket can be open for no more than 5 seconds
      socket.setTimeout(() => socket.close(), 5000);

      socket.on('close', (code) => {
        check(code, {
          'normal closure': (code) => code === 1000,
        });
        trace.ws_graphql_close.add(Date.now() - start);
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
          trace.ws_graphql_ack.add(Date.now() - start);

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
            'received next message': (data) =>
              parseMessage(data).type === MessageType.Next,
          });
          trace.ws_graphql_next.add(Date.now() - start);
        } else if (msgs === 3) {
          check(data, {
            'received complete message': (data) =>
              parseMessage(data).type === MessageType.Complete,
          });
          trace.ws_graphql_complete.add(Date.now() - start);

          // we're done once completed
          socket.close(1000);
        } else fail(`Shouldn't have msgs ${msgs} messages`);
      });
    },
  );

  check(res, { 'status was 101': (r) => r && r.status === 101 });
}
