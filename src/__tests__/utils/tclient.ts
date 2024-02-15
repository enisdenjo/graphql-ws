import WebSocket from 'ws';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../../common';

export interface TClient {
  ws: WebSocket;
  waitForMessage: (
    test?: (data: WebSocket.MessageEvent) => void,
    expire?: number,
  ) => Promise<void>;
  waitForClose: (
    test?: (event: WebSocket.CloseEvent) => void,
    expire?: number,
  ) => Promise<void>;
}

type EventHandlerFunction = (event: WebSocket.Event) => void;

export function createTClient(
  url: string,
  protocols: string | string[] = GRAPHQL_TRANSPORT_WS_PROTOCOL,
): Promise<TClient> {
  const waiters: EventHandlerFunction[] = [];
  const events: WebSocket.Event[] = [];
  const waitForEvent = (
    type: string,
    test?: EventHandlerFunction,
    expire?: number,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const waiter = (event: WebSocket.Event) => {
        if (event.type === type) {
          test?.(event);
          resolve();
        } else {
          reject(new Error(`Unexpected ${event.type}`));
        }
      };

      if (events.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        waiter(events.shift()!);
      } else {
        waiters.push(waiter);
      }

      if (expire)
        setTimeout(() => {
          const index = waiters.findIndex((w) => w === waiter);
          if (index >= 0) waiters.splice(index);
          resolve();
        }, expire);
    });
  };
  const handleEvent = (event: WebSocket.Event) => {
    if (waiters.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      waiters.shift()!(event);
    } else {
      events.push(event);
    }
  };

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, protocols);
    ws.onclose = handleEvent;
    ws.onmessage = handleEvent;
    ws.once('error', reject);
    ws.once('open', () =>
      resolve({
        ws,
        waitForMessage: (test, expire) =>
          waitForEvent('message', test as EventHandlerFunction, expire),
        waitForClose: (test, expire) =>
          waitForEvent('close', test as EventHandlerFunction, expire),
      }),
    );
  });
}
