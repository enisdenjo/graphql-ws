/**
 *
 * GraphQL over WebSocket Protocol
 *
 * Check out the `PROTOCOL.md` document for the transport specification.
 *
 */

import { Sink, UUID, Disposable } from './types';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';
import {
  MessageType,
  parseMessage,
  stringifyMessage,
  SubscribePayload,
} from './message';
import { hasOwnProperty, isObject } from './utils';

type CancellerRef = { current: (() => void) | null };

/** Configuration used for the `create` client function. */
export interface ClientOptions {
  /** URL of the GraphQL server to connect. */
  url: string;
  /** Optional parameters that the client specifies when establishing a connection with the server. */
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
  /**
   * Should the connection be established immediately and persisted
   * or after the first listener subscribed.
   * @default true
   */
  lazy?: boolean;
}

export interface Client extends Disposable {
  /**
   * Subscribes through the WebSocket following the config parameters. It
   * uses the `sink` to emit received data or errors. Returns a _cleanup_
   * function used for dropping the subscription and cleaning stuff up.
   */
  subscribe<T = unknown>(payload: SubscribePayload, sink: Sink<T>): () => void;
}

/** Creates a disposable GQL subscriptions client. */
export function createClient(options: ClientOptions): Client {
  const { url, connectionParams, lazy = true } = options;

  let state = {
    socket: null as WebSocket | null,
    acknowledged: false,
    locks: 0,
  };
  async function connect(
    cancellerRef: CancellerRef,
  ): Promise<[socket: WebSocket, throwOrCancel: () => Promise<void>]> {
    if (state.socket) {
      switch (state.socket.readyState) {
        case WebSocket.OPEN: {
          // if the socket is not acknowledged, wait a bit and reavaluate
          // TODO-db-200908 can you guarantee finite recursive calls?
          if (!state.acknowledged) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return connect(cancellerRef);
          }

          return [
            state.socket,
            () =>
              new Promise((resolve, reject) => {
                if (!state.socket) {
                  return reject(new Error('Socket closed unexpectedly'));
                }
                if (state.socket.readyState === WebSocket.CLOSED) {
                  return reject(new Error('Socket has already been closed'));
                }

                state.locks++;

                state.socket.addEventListener('close', listener);
                function listener(event: CloseEvent) {
                  state.locks--;
                  state.socket?.removeEventListener('close', listener);
                  return reject(event);
                }

                cancellerRef.current = () => {
                  state.locks--;
                  if (!state.locks) {
                    state.socket?.close(1000, 'Normal Closure');
                  }
                  state.socket?.removeEventListener('close', listener);
                  return resolve();
                };
              }),
          ];
        }
        case WebSocket.CONNECTING: {
          let waitedTimes = 0;
          while (
            state.socket && // the socket can be deleted in the meantime
            state.socket.readyState === WebSocket.CONNECTING
          ) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            // 100ms * 50 = 5sec
            if (waitedTimes >= 50) {
              throw new Error(
                'Waited 5 seconds but socket finished connecting',
              );
            }
            waitedTimes++;
          }
          return connect(cancellerRef); // reavaluate
        }
        case WebSocket.CLOSED:
          break; // just continue, we'll make a new one
        case WebSocket.CLOSING: {
          let waitedTimes = 0;
          while (
            state.socket && // the socket can be deleted in the meantime
            state.socket.readyState === WebSocket.CLOSING
          ) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            // 100ms * 50 = 5sec
            if (waitedTimes >= 50) {
              throw new Error('Waited 5 seconds but socket closed');
            }
            waitedTimes++;
          }
          break; // let it close and then make a new one
        }
        default:
          throw new Error(`Impossible ready state ${state.socket.readyState}`);
      }
    }

    // establish connection and assign to singleton
    const socket = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    state = { ...state, acknowledged: false, socket };

    await new Promise((resolve, reject) => {
      let settled = false,
        cancelled = false;
      setTimeout(() => {
        if (!settled) {
          socket.close(
            3408,
            'Waited 5 seconds but socket connect never settled',
          );
          // onclose should reject and settled = true
        }
      }, 5 * 1000);
      cancellerRef.current = () => (cancelled = true);

      /**
       * `onerror` handler is unnecessary because even if an error occurs, the `onclose` handler will be called
       *
       * From: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
       * > If an error occurs while attempting to connect, first a simple event with the name error is sent to the
       * > WebSocket object (thereby invoking its onerror handler), and then the CloseEvent is sent to the WebSocket
       * > object (thereby invoking its onclose handler) to indicate the reason for the connection's closing.
       */

      socket.onclose = (event) => {
        socket.onclose = null;
        if (settled) {
          return;
        }

        state = { ...state, acknowledged: false, socket: null };
        settled = true;
        reject(event);
      };

      socket.onmessage = (event: MessageEvent) => {
        socket.onmessage = null;
        if (settled) {
          return;
        }
        if (cancelled) {
          socket.close(3499, 'Client cancelled the socket before connecting');
          return;
        }

        try {
          const message = parseMessage(event.data);
          if (message.type !== MessageType.ConnectionAck) {
            throw new Error(`First message cannot be of type ${message.type}`);
          }

          state = { ...state, acknowledged: true, socket };
          settled = true;
          resolve();
        } catch (err) {
          socket.close(4400, err);
          // the onclose should reject and settle
        }
      };

      // as soon as the socket opens, send the connection initalisation request
      socket.onopen = () => {
        socket.onopen = null;
        if (cancelled) {
          socket.close(3499, 'Client cancelled the socket before connecting');
          return;
        }

        socket.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
            payload:
              typeof connectionParams === 'function'
                ? connectionParams()
                : connectionParams,
          }),
        );
      };
    });

    return [
      socket,
      () =>
        new Promise((resolve, reject) => {
          if (socket.readyState === WebSocket.CLOSED) {
            return reject(new Error('Socket has already been closed'));
          }

          state.locks++;

          socket.addEventListener('close', listener);
          function listener(event: CloseEvent) {
            state.locks--;
            socket.removeEventListener('close', listener);
            return reject(event);
          }

          cancellerRef.current = () => {
            state.locks--;
            if (!state.locks) {
              socket.close(1000, 'Normal Closure');
            }
            socket.removeEventListener('close', listener);
            return resolve();
          };
        }),
    ];
  }

  // in non-lazy mode always hold one connection lock to persist the socket
  if (!lazy) {
    (async () => {
      try {
        const [, throwOrCancel] = await connect({ current: null });
        await throwOrCancel(); // either the canceller will be called or the socket closed
      } catch (errOrCloseEvent) {
        // normal closure is disposal, shouldnt throw
        if (isCloseEvent(errOrCloseEvent) && errOrCloseEvent.code === 1000) {
          return;
        }

        throw errOrCloseEvent;
      }
    })();
  }

  return {
    subscribe(payload, sink) {
      const uuid = generateUUID();

      const messageHandler = ({ data }: MessageEvent) => {
        const message = parseMessage(data);
        switch (message.type) {
          case MessageType.Next: {
            if (message.id === uuid) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              sink.next(message.payload as any);
            }
            break;
          }
          case MessageType.Error: {
            if (message.id === uuid) {
              sink.error(message.payload);
            }
            break;
          }
          case MessageType.Complete: {
            if (message.id === uuid) {
              sink.complete();
            }
            break;
          }
        }
      };

      const cancellerRef: CancellerRef = { current: null };
      (async () => {
        try {
          const [socket, throwOrCancel] = await connect(cancellerRef);
          socket.addEventListener('message', messageHandler);

          socket.send(
            stringifyMessage<MessageType.Subscribe>({
              id: uuid,
              type: MessageType.Subscribe,
              payload,
            }),
          );

          // either the canceller will be called and the promise resolved
          // or the socket closed and the promise rejected
          await throwOrCancel();

          // TODO-db-200909 wont be removed on throw, but should it? the socket is closed on throw
          socket.removeEventListener('message', messageHandler);

          // send complete message to server
          socket.send(
            stringifyMessage<MessageType.Complete>({
              id: uuid,
              type: MessageType.Complete,
            }),
          );
        } catch (errOrCloseEvent) {
          // throw non `CloseEvent`s immediately, something else is wrong
          if (!isCloseEvent(errOrCloseEvent)) {
            throw errOrCloseEvent;
          }

          // normal closure is disposal, shouldnt try again
          if (errOrCloseEvent.code === 1000) {
            return;
          }

          // user cancelled early, shouldnt try again
          if (errOrCloseEvent.code === 3499) {
            return;
          }

          throw errOrCloseEvent;
        }
      })()
        .catch(sink.error)
        .then(sink.complete); // only catch, resolves on cancel or normal closure

      return () => {
        if (cancellerRef.current) {
          cancellerRef.current();
        }
      };
    },
    dispose() {
      if (state.socket) {
        state.socket.close(1000, 'Normal Closure');
      }
    },
  };
}

function isCloseEvent(val: unknown): val is CloseEvent {
  return isObject(val) && hasOwnProperty(val, 'code');
}

/** Generates a new v4 UUID. Reference: https://stackoverflow.com/a/2117523/709884 */
function generateUUID(): UUID {
  if (!window.crypto) {
    // fallback to Math.random when crypto is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (
      c,
    ) {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (s) => {
    const c = Number.parseInt(s, 10);
    return (
      c ^
      (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16);
  });
}
