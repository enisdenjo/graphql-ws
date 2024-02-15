import WebSocket from 'ws';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../../common';

type EventHandlerFunction = (event: WebSocket.Event) => void;
type SnapshotEntry =
  | WebSocket.Data
  | { code: number; reason: string; wasClean: boolean }
  | { failure: string };

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
  waitForSnapshot: () => Promise<SnapshotEntry[]>;
}

export function createTClient(
  url: string,
  protocols: string | string[] = GRAPHQL_TRANSPORT_WS_PROTOCOL,
): Promise<TClient> {
  const waiters: EventHandlerFunction[] = [];
  const events: WebSocket.Event[] = [];
  const waitForAnyEvent = (
    expire?: number,
  ): Promise<WebSocket.Event | undefined> => {
    return new Promise((resolve) => {
      const waiter = (event: WebSocket.Event) => {
        resolve(event);
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
          resolve(undefined);
        }, expire);
    });
  };
  const waitForEvent = async (
    type: string,
    test?: EventHandlerFunction,
    expire?: number,
  ): Promise<void> => {
    const event = await waitForAnyEvent(expire);

    if (!event) {
      return;
    } else if (event.type !== type) {
      throw new Error(`Unexpected ${event.type}`);
    }

    test?.(event);
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
        waitForSnapshot: async () => {
          const snapshot: SnapshotEntry[] = [];

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const event = await waitForAnyEvent(30);
            switch (event?.type) {
              case 'message': {
                const { data } = event as WebSocket.MessageEvent;
                snapshot.push(data);
                break;
              }
              case 'close': {
                const { code, reason, wasClean } =
                  event as WebSocket.CloseEvent;
                snapshot.push({ code, reason, wasClean });
                break;
              }
              default:
                return snapshot;
            }
          }
        },
      }),
    );
  });
}
