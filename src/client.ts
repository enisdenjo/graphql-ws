/**
 *
 * client
 *
 */

import { Sink, ID, Disposable } from './types';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';
import {
  Message,
  MessageType,
  parseMessage,
  stringifyMessage,
  SubscribePayload,
} from './message';
import { isObject } from './utils';

export type EventConnecting = 'connecting';
export type EventConnected = 'connected'; // connected = socket opened + acknowledged
export type EventClosed = 'closed';
export type Event = EventConnecting | EventConnected | EventClosed;

/**
 * The argument is actually the `WebSocket`, but to avoid bundling DOM typings
 * because the client can run in Node env too, you should assert
 * the websocket type during implementation.
 */
export type EventConnectedHandler = (socket: unknown) => void;

export type EventConnectingHandler = () => void;

/**
 * The argument is actually the websocket `CloseEvent`, but to avoid
 * bundling DOM typings because the client can run in Node env too,
 * you should assert the websocket type during implementation.
 */
export type EventClosedHandler = (event: unknown) => void;

export type EventListener<E extends Event> = E extends EventConnecting
  ? EventConnectingHandler
  : E extends EventConnected
  ? EventConnectedHandler
  : E extends EventClosed
  ? EventClosedHandler
  : never;

type CancellerRef = { current: (() => void) | null };

/** Configuration used for the `create` client function. */
export interface ClientOptions {
  /** URL of the GraphQL over WebSocket Protocol compliant server to connect. */
  url: string;
  /**
   * Optional parameters, passed through the `payload` field with the `ConnectionInit` message,
   * that the client specifies when establishing a connection with the server. You can use this
   * for securely passing arguments for authentication.
   */
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
  /**
   * Should the connection be established immediately and persisted
   * or after the first listener subscribed.
   *
   * @default true
   */
  lazy?: boolean;
  /**
   * How many times should the client try to reconnect on abnormal socket closure before it errors out?
   *
   * @default 5
   */
  retryAttempts?: number;
  /**
   * How long should the client wait until attempting to retry.
   *
   * @default 3 * 1000 (3 seconds)
   */
  retryTimeout?: number;
  /**
   * Register listeners before initialising the client. This way
   * you can ensure to catch all client relevant emitted events.
   *
   * The listeners passed in will **always** be the first ones
   * to get the emitted event before other registered listeners.
   */
  on?: Partial<{ [event in Event]: EventListener<event> }>;
  /**
   * A custom WebSocket implementation to use instead of the
   * one provided by the global scope. Mostly useful for when
   * using the client outside of the browser environment.
   */
  webSocketImpl?: unknown;
  /**
   * A custom ID generator for identifying subscriptions.
   *
   * The default generates a v4 UUID to be used as the ID using `Math`
   * as the random number generator. Supply your own generator
   * in case you need more uniqueness.
   *
   * Reference: https://stackoverflow.com/a/2117523/709884
   */
  generateID?: () => ID;
}

export interface Client extends Disposable {
  /**
   * Listens on the client which dispatches events about the socket state.
   */
  on<E extends Event>(event: E, listener: EventListener<E>): () => void;
  /**
   * Subscribes through the WebSocket following the config parameters. It
   * uses the `sink` to emit received data or errors. Returns a _cleanup_
   * function used for dropping the subscription and cleaning stuff up.
   */
  subscribe<T = unknown>(payload: SubscribePayload, sink: Sink<T>): () => void;
}

/** Creates a disposable GraphQL subscriptions client. */
export function createClient(options: ClientOptions): Client {
  const {
    url,
    connectionParams,
    lazy = true,
    retryAttempts = 5,
    retryTimeout = 3 * 1000, // 3 seconds
    on,
    webSocketImpl,
    /**
     * Generates a v4 UUID to be used as the ID using `Math`
     * as the random number generator. Supply your own generator
     * in case you need more uniqueness.
     *
     * Reference: https://stackoverflow.com/a/2117523/709884
     */
    generateID = function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  } = options;

  let ws;
  if (webSocketImpl) {
    if (!isWebSocket(webSocketImpl)) {
      throw new Error('Invalid WebSocket implementation provided');
    }
    ws = webSocketImpl;
  } else if (typeof WebSocket !== 'undefined') {
    ws = WebSocket;
  } else if (typeof global !== 'undefined') {
    // @ts-expect-error: Support more browsers
    ws = global.WebSocket || global.MozWebSocket;
  } else if (typeof window !== 'undefined') {
    // @ts-expect-error: Support more browsers
    ws = window.WebSocket || window.MozWebSocket;
  }
  if (!ws) {
    throw new Error('WebSocket implementation missing');
  }
  const WebSocketImpl = ws;

  // websocket status emitter, subscriptions are handled differently
  const emitter = (() => {
    const listeners: { [event in Event]: EventListener<event>[] } = {
      connecting: on?.connecting ? [on.connecting] : [],
      connected: on?.connected ? [on.connected] : [],
      closed: on?.closed ? [on.closed] : [],
    };

    return {
      on<E extends Event>(event: E, listener: EventListener<E>) {
        const l = listeners[event] as EventListener<E>[];
        l.push(listener);
        return () => {
          l.splice(l.indexOf(listener), 1);
        };
      },
      emit<E extends Event>(event: E, ...args: Parameters<EventListener<E>>) {
        (listeners[event] as EventListener<E>[]).forEach((listener) => {
          // @ts-expect-error: The args should fit
          listener(...args);
        });
      },
      reset() {
        (Object.keys(listeners) as (keyof typeof listeners)[]).forEach(
          (event) => {
            listeners[event] = [];
          },
        );
      },
    };
  })();

  let state = {
    socket: null as WebSocket | null,
    acknowledged: false,
    locks: 0,
    tries: 0,
  };
  async function connect(
    cancellerRef: CancellerRef,
    callDepth = 0,
  ): Promise<
    [
      socket: WebSocket,
      throwOnCloseOrWaitForCancel: (cleanup?: () => void) => Promise<void>,
    ]
  > {
    // prevents too many recursive calls when reavaluating/re-connecting
    if (callDepth > 10) {
      throw new Error('Kept trying to connect but the socket never settled.');
    }

    // socket already exists. can be ready or pending, check and behave accordingly
    if (state.socket) {
      switch (state.socket.readyState) {
        case WebSocketImpl.OPEN: {
          // if the socket is not acknowledged, wait a bit and reavaluate
          if (!state.acknowledged) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            return connect(cancellerRef, callDepth + 1);
          }

          return [
            state.socket,
            (cleanup) =>
              new Promise((resolve, reject) => {
                if (!state.socket) {
                  return reject(new Error('Socket closed unexpectedly'));
                }
                if (state.socket.readyState === WebSocketImpl.CLOSED) {
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
                  cleanup?.();
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
        case WebSocketImpl.CONNECTING: {
          // if the socket is in the connecting phase, wait a bit and reavaluate
          await new Promise((resolve) => setTimeout(resolve, 300));
          return connect(cancellerRef, callDepth + 1);
        }
        case WebSocketImpl.CLOSED:
          break; // just continue, we'll make a new one
        case WebSocketImpl.CLOSING: {
          // if the socket is in the closing phase, wait a bit and connect
          await new Promise((resolve) => setTimeout(resolve, 300));
          return connect(cancellerRef, callDepth + 1);
        }
        default:
          throw new Error(`Impossible ready state ${state.socket.readyState}`);
      }
    }

    // establish connection and assign to singleton
    const socket = new WebSocketImpl(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    state = {
      ...state,
      acknowledged: false,
      socket,
      tries: state.tries + 1,
    };
    emitter.emit('connecting');

    await new Promise((resolve, reject) => {
      let cancelled = false;
      cancellerRef.current = () => (cancelled = true);

      const tooLong = setTimeout(() => {
        socket.close(3408, 'Waited 5 seconds but socket connect never settled');
      }, 5 * 1000);

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
        clearTimeout(tooLong);
        state = { ...state, acknowledged: false, socket: null };
        emitter.emit('closed', event);
        return reject(event);
      };

      socket.onmessage = (event: MessageEvent) => {
        socket.onmessage = null;
        if (cancelled) {
          socket.close(3499, 'Client cancelled the socket before connecting');
          return;
        }

        try {
          const message = parseMessage(event.data);
          if (message.type !== MessageType.ConnectionAck) {
            throw new Error(`First message cannot be of type ${message.type}`);
          }

          clearTimeout(tooLong);
          state = { ...state, acknowledged: true, socket, tries: 0 };
          emitter.emit('connected', socket); // connected = socket opened + acknowledged
          return resolve();
        } catch (err) {
          socket.close(4400, err);
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
      (cleanup) =>
        new Promise((resolve, reject) => {
          if (socket.readyState === WebSocketImpl.CLOSED) {
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
            cleanup?.();
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

  // in non-lazy (hot?) mode always hold one connection lock to persist the socket
  if (!lazy) {
    (async () => {
      for (;;) {
        try {
          const [, throwOnCloseOrWaitForCancel] = await connect({
            current: null,
          });
          await throwOnCloseOrWaitForCancel();
          // cancelled, shouldnt try again
          return;
        } catch (errOrCloseEvent) {
          // throw non `CloseEvent`s immediately, something else is wrong
          if (!isCloseEvent(errOrCloseEvent)) {
            throw errOrCloseEvent; // TODO-db-200909 promise is uncaught, will appear in console
          }

          // normal closure is disposal, shouldnt try again
          if (errOrCloseEvent.code === 1000) {
            return;
          }

          // retries are not allowed or we tried to many times, close for good
          if (!retryAttempts || state.tries > retryAttempts) {
            return;
          }

          // otherwize, wait a bit and retry
          await new Promise((resolve) => setTimeout(resolve, retryTimeout));
        }
      }
    })();
  }

  // to avoid parsing the same message in each
  // subscriber, we memo one on the last received data
  let lastData: unknown, lastMessage: Message;
  function memoParseMessage(data: unknown) {
    if (data !== lastData) {
      lastMessage = parseMessage(data);
      lastData = data;
    }
    return lastMessage;
  }

  return {
    on: emitter.on,
    subscribe(payload, sink) {
      const id = generateID();
      const cancellerRef: CancellerRef = { current: null };

      const messageHandler = ({ data }: MessageEvent) => {
        const message = memoParseMessage(data);
        switch (message.type) {
          case MessageType.Next: {
            if (message.id === id) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              sink.next(message.payload as any);
            }
            return;
          }
          case MessageType.Error: {
            if (message.id === id) {
              sink.error(message.payload);

              // the canceller must be set at this point
              // because you cannot receive a message
              // if there is no existing connection
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              cancellerRef.current!();
              // TODO-db-201025 calling canceller will complete the sink, meaning that both the `error` and `complete` will be
              // called. neither promises or observables care; once they settle, additional calls to the resolvers will be ignored
            }
            return;
          }
          case MessageType.Complete: {
            if (message.id === id) {
              // the canceller must be set at this point
              // because you cannot receive a message
              // if there is no existing connection
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              cancellerRef.current!();
              // calling canceller will complete the sink
            }
            return;
          }
        }
      };

      (async () => {
        for (;;) {
          try {
            const [socket, throwOnCloseOrWaitForCancel] = await connect(
              cancellerRef,
            );
            socket.addEventListener('message', messageHandler);

            socket.send(
              stringifyMessage<MessageType.Subscribe>({
                id: id,
                type: MessageType.Subscribe,
                payload,
              }),
            );

            // either the canceller will be called and the promise resolved
            // or the socket closed and the promise rejected
            await throwOnCloseOrWaitForCancel(() => {
              // send complete message to server on cancel
              socket.send(
                stringifyMessage<MessageType.Complete>({
                  id: id,
                  type: MessageType.Complete,
                }),
              );
            });

            socket.removeEventListener('message', messageHandler);

            // cancelled, shouldnt try again
            return;
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

            // retries are not allowed or we tried to many times, close for good
            if (!retryAttempts || state.tries > retryAttempts) {
              throw errOrCloseEvent;
            }

            // otherwize, wait a bit and retry
            await new Promise((resolve) => setTimeout(resolve, retryTimeout));
          }
        }
      })()
        .catch(sink.error)
        .then(sink.complete) // resolves on cancel or normal closure
        .finally(() => (cancellerRef.current = null)); // when this promise settles there is nothing to cancel

      return () => {
        cancellerRef.current?.();
      };
    },
    dispose() {
      state.socket?.close(1000, 'Normal Closure');
      emitter.reset();
    },
  };
}

function isCloseEvent(val: unknown): val is CloseEvent {
  return isObject(val) && 'code' in val && 'reason' in val && 'wasClean' in val;
}

function isWebSocket(val: unknown): val is typeof WebSocket {
  return (
    typeof val === 'function' &&
    'constructor' in val &&
    'CLOSED' in val &&
    'CLOSING' in val &&
    'CONNECTING' in val &&
    'OPEN' in val
  );
}
