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
 * The first argument is actually the `WebSocket`, but to avoid
 * bundling DOM typings because the client can run in Node env too,
 * you should assert the websocket type during implementation.
 *
 * Also, the second argument is the optional payload that the server may
 * send through the `ConnectionAck` message.
 */
export type EventConnectedListener = (
  socket: unknown,
  payload?: Record<string, unknown>,
) => void;

export type EventConnectingListener = () => void;

/**
 * The argument is actually the websocket `CloseEvent`, but to avoid
 * bundling DOM typings because the client can run in Node env too,
 * you should assert the websocket type during implementation.
 */
export type EventClosedListener = (event: unknown) => void;

export type EventListener<E extends Event> = E extends EventConnecting
  ? EventConnectingListener
  : E extends EventConnected
  ? EventConnectedListener
  : E extends EventClosed
  ? EventClosedListener
  : never;

type CancellerRef = { current: (() => void) | null };

/** Configuration used for the GraphQL over WebSocket client. */
export interface ClientOptions {
  /** URL of the GraphQL over WebSocket Protocol compliant server to connect. */
  url: string;
  /**
   * Optional parameters, passed through the `payload` field with the `ConnectionInit` message,
   * that the client specifies when establishing a connection with the server. You can use this
   * for securely passing arguments for authentication.
   *
   * If you decide to return a promise, keep in mind that the server might kick you off if it
   * takes too long to resolve! Check the `connectionInitWaitTimeout` on the server for more info.
   *
   * Throwing an error from within this function will close the socket with the `Error` message
   * in the close event reason.
   */
  connectionParams?:
    | Record<string, unknown>
    | (() => Promise<Record<string, unknown>> | Record<string, unknown>);
  /**
   * Should the connection be established immediately and persisted
   * or after the first listener subscribed.
   *
   * @default true
   */
  lazy?: boolean;
  /**
   * How long should the client wait before closing the socket after the last oparation has
   * completed. This is meant to be used in combination with `lazy`. You might want to have
   * a calmdown time before actually closing the connection. Kinda' like a lazy close "debounce".
   *
   * @default 0 // close immediately
   */
  keepAlive?: number;
  /**
   * How many times should the client try to reconnect on abnormal socket closure before it errors out?
   *
   * The library classifies the following close events as fatal:
   * - `1002: Protocol Error`
   * - `1011: Internal Error`
   * - `4400: Bad Request`
   * - `4401: Unauthorized` _tried subscribing before connect ack_
   * - `4409: Subscriber for <id> already exists` _distinction is very important_
   * - `4429: Too many initialisation requests`
   *
   * These events are reported immediately and the client will not reconnect.
   *
   * @default 5
   */
  retryAttempts?: number;
  /**
   * Control the wait time between retries. You may implement your own strategy
   * by timing the resolution of the returned promise.
   *
   * @default Randomised exponential backoff
   */
  retryWait?: (tries: number) => Promise<void>;
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

/** Creates a disposable GraphQL over WebSocket client. */
export function createClient(options: ClientOptions): Client {
  const {
    url,
    connectionParams,
    lazy = true,
    keepAlive = 0,
    retryAttempts = 5,
    /**
     * Retry with randomised exponential backoff.
     */
    retryWait = async function retryWait(tries) {
      let retryDelay = 1000; // 1s
      for (let i = 0; i < tries; i++) {
        retryDelay *= 2;
      }
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          retryDelay +
            // add random timeout from 300ms to 3s
            Math.floor(Math.random() * (3000 - 300) + 300),
        ),
      );
    },
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
    ws =
      global.WebSocket ||
      // @ts-expect-error: Support more browsers
      global.MozWebSocket;
  } else if (typeof window !== 'undefined') {
    ws =
      window.WebSocket ||
      // @ts-expect-error: Support more browsers
      window.MozWebSocket;
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
        for (const listener of listeners[event]) {
          // @ts-expect-error: The args should fit
          listener(...args);
        }
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
    retrying: false,
    retries: 0,
  };

  // all those waiting for the `retryWait` to resolve
  const retryWaiting: (() => void)[] = [];

  type ConnectReturn = Promise<
    [
      socket: WebSocket,
      throwOnCloseOrWaitForCancel: (cleanup?: () => void) => Promise<void>,
    ]
  >;
  async function connect(
    cancellerRef: CancellerRef,
    callDepth = 0,
  ): ConnectReturn {
    // prevents too many recursive calls when reavaluating/re-connecting
    if (callDepth > 10) {
      throw new Error('Kept trying to connect but the socket never settled.');
    }

    // retry wait strategy only on root caller
    if (state.retrying && callDepth === 0) {
      if (retryWaiting.length) {
        // if others are waiting for retry, I'll wait too
        await new Promise<void>((resolve) => retryWaiting.push(resolve));
      } else {
        retryWaiting.push(() => {
          /** fake waiter to lead following connects in the `retryWaiting` queue */
        });
        // use retry wait strategy
        await retryWait(state.retries);
        // complete all waiting and clear the queue
        while (retryWaiting.length) {
          retryWaiting.pop()?.();
        }
      }
    }

    // if recursive call, wait a bit for socket change
    await new Promise((resolve) => setTimeout(resolve, callDepth * 50));

    // socket already exists. can be ready or pending, check and behave accordingly
    if (state.socket) {
      switch (state.socket.readyState) {
        case WebSocketImpl.OPEN: {
          // if the socket is not acknowledged, wait a bit and reavaluate
          if (!state.acknowledged) {
            return connect(cancellerRef, callDepth + 1);
          }

          return makeConnectReturn(state.socket, cancellerRef);
        }
        case WebSocketImpl.CONNECTING: {
          // if the socket is in the connecting phase, wait a bit and reavaluate
          return connect(cancellerRef, callDepth + 1);
        }
        case WebSocketImpl.CLOSED:
          break; // just continue, we'll make a new one
        case WebSocketImpl.CLOSING: {
          // if the socket is in the closing phase, wait a bit and connect
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
      retries: state.retrying ? state.retries + 1 : state.retries,
    };
    emitter.emit('connecting');

    await new Promise<void>((resolve, reject) => {
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
          state = {
            ...state,
            acknowledged: true,
            socket,
            retrying: false,
            retries: 0,
          };
          emitter.emit('connected', socket, message.payload); // connected = socket opened + acknowledged
          return resolve();
        } catch (err) {
          socket.close(
            4400,
            err instanceof Error ? err.message : new Error(err).message,
          );
        }
      };

      // as soon as the socket opens and the connectionParams
      // resolve, send the connection initalisation request
      socket.onopen = () => {
        socket.onopen = null;
        if (cancelled) {
          socket.close(3499, 'Client cancelled the socket before connecting');
          return;
        }

        (async () => {
          try {
            socket.send(
              stringifyMessage<MessageType.ConnectionInit>({
                type: MessageType.ConnectionInit,
                payload:
                  typeof connectionParams === 'function'
                    ? await connectionParams()
                    : connectionParams,
              }),
            );
          } catch (err) {
            // even if not open, call close again to report error
            socket.close(
              4400,
              err instanceof Error ? err.message : new Error(err).message,
            );
          }
        })();
      };
    });

    return makeConnectReturn(socket, cancellerRef);
  }
  async function makeConnectReturn(
    socket: WebSocket,
    cancellerRef: CancellerRef,
  ): ConnectReturn {
    return [
      socket,
      (cleanup) =>
        new Promise((resolve, reject) => {
          if (socket.readyState === WebSocketImpl.CLOSED) {
            return reject(new Error('Socket has already been closed'));
          }

          state.locks++;

          socket.addEventListener('close', listener);
          function listener(event: LikeCloseEvent) {
            cancellerRef.current = null;
            state.locks--;
            socket.removeEventListener('close', listener);
            return reject(event);
          }

          cancellerRef.current = () => {
            cancellerRef.current = null;
            cleanup?.();
            state.locks--;
            if (!state.locks) {
              if (keepAlive > 0 && isFinite(keepAlive)) {
                // if the keepalive is set, allow for the specified calmdown
                // time and then close. but only if no lock got created in the
                // meantime and if the socket is still open
                setTimeout(() => {
                  if (!state.locks && socket.OPEN) {
                    socket.close(1000, 'Normal Closure');
                  }
                }, keepAlive);
              } else {
                // otherwise close immediately
                socket.close(1000, 'Normal Closure');
              }
            }
            socket.removeEventListener('close', listener);
            return resolve();
          };
        }),
    ];
  }
  /**
   * Checks the `connect` problem and evaluates if the client should
   * retry. If the problem is worth throwing, it will be thrown immediately.
   */
  function shouldRetryConnectOrThrow(errOrCloseEvent: unknown): boolean {
    // throw non `CloseEvent`s immediately, something else is wrong
    if (!isLikeCloseEvent(errOrCloseEvent)) {
      throw errOrCloseEvent;
    }

    // some close codes are worth reporting immediately
    if (
      [
        1002, // Protocol Error
        1011, // Internal Error
        4400, // Bad Request
        4401, // Unauthorized (tried subscribing before connect ack)
        4409, // Subscriber for <id> already exists (distinction is very important)
        4429, // Too many initialisation requests
      ].includes(errOrCloseEvent.code)
    ) {
      throw errOrCloseEvent;
    }

    // normal closure is disposal, shouldnt try again
    if (errOrCloseEvent.code === 1000) {
      return false;
    }

    // user cancelled early, shouldnt try again
    if (errOrCloseEvent.code === 3499) {
      return false;
    }

    // retries are not allowed or we tried to many times, report error
    if (!retryAttempts || state.retries >= retryAttempts) {
      throw errOrCloseEvent;
    }

    // looks good, start retrying
    state.retrying = true;
    return true;
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
          // return if shouldnt try again
          if (!shouldRetryConnectOrThrow(errOrCloseEvent)) return;
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
      let completed = false;
      const cancellerRef: CancellerRef = { current: null };

      const messageListener = ({ data }: MessageEvent) => {
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
              completed = true;
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
            socket.addEventListener('message', messageListener);

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
              // if not completed already, send complete message to server on cancel
              if (!completed) {
                socket.send(
                  stringifyMessage<MessageType.Complete>({
                    id: id,
                    type: MessageType.Complete,
                  }),
                );
              }
            });

            socket.removeEventListener('message', messageListener);

            // cancelled, shouldnt try again
            return;
          } catch (errOrCloseEvent) {
            // return if shouldnt try again
            if (!shouldRetryConnectOrThrow(errOrCloseEvent)) return;
          }
        }
      })()
        .catch(sink.error)
        .then(sink.complete); // resolves on cancel or normal closure

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

/** Minimal close event interface required by the lib for error and socket close handling. */
interface LikeCloseEvent {
  /** Returns the WebSocket connection close code provided by the server. */
  readonly code: number;
  /** Returns the WebSocket connection close reason provided by the server. */
  readonly reason: string;
}

function isLikeCloseEvent(val: unknown): val is LikeCloseEvent {
  return isObject(val) && 'code' in val && 'reason' in val;
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
