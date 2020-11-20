import WebSocket from 'ws';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../../protocol';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createTClient(
  url: string,
  protocols: string | string[] = GRAPHQL_TRANSPORT_WS_PROTOCOL,
) {
  let closeEvent: WebSocket.CloseEvent;
  const queue: WebSocket.MessageEvent[] = [];
  return new Promise<{
    ws: WebSocket;
    waitForMessage: (
      test?: (data: WebSocket.MessageEvent) => void,
      expire?: number,
    ) => Promise<void>;
    waitForClose: (
      test?: (event: WebSocket.CloseEvent) => void,
      expire?: number,
    ) => Promise<void>;
  }>((resolve) => {
    const ws = new WebSocket(url, protocols);
    ws.onclose = (event) => (closeEvent = event); // just so that none are missed
    ws.onmessage = (message) => queue.push(message); // guarantee message delivery with a queue
    ws.once('open', () =>
      resolve({
        ws,
        async waitForMessage(test, expire) {
          return new Promise((resolve) => {
            const done = () => {
              // the onmessage listener above will be called before our listener, populating the queue
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const next = queue.shift()!;
              test?.(next);
              resolve();
            };
            if (queue.length > 0) {
              return done();
            }
            ws.once('message', done);
            if (expire) {
              setTimeout(() => {
                ws.removeListener('message', done); // expired
                resolve();
              }, expire);
            }
          });
        },
        async waitForClose(
          test?: (event: WebSocket.CloseEvent) => void,
          expire?: number,
        ) {
          return new Promise((resolve) => {
            if (closeEvent) {
              test?.(closeEvent);
              return resolve();
            }
            ws.onclose = (event) => {
              closeEvent = event;
              test?.(event);
              resolve();
            };
            if (expire) {
              setTimeout(() => {
                // @ts-expect-error: its ok
                ws.onclose = null; // expired
                resolve();
              }, expire);
            }
          });
        },
      }),
    );
  });
}
