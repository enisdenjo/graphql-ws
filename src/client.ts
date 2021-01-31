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

// this file is the entry point for browsers, re-export relevant elements
export * from './message';
export * from './protocol';

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
   * Used ONLY when the client is in non-lazy mode (`lazy = false`). When
   * using this mode, the errors might have no sinks to report to; however,
   * to avoid swallowing errors, consider using `onNonLazyError`,  which will
   * be called when either:
   * - An unrecoverable error/close event occurs
   * - Silent retry attempts have been exceeded
   *
   * After a client has errored out, it will NOT perform any automatic actions.
   *
   * The argument can be a websocket `CloseEvent` or an `Error`. To avoid bundling
   * DOM types, you should derive and assert the correct type. When receiving:
   * - A `CloseEvent`: retry attempts have been exceeded or the specific
   * close event is labeled as fatal (read more in `retryAttempts`).
   * - An `Error`: some internal issue has occured, all internal errors are
   * fatal by nature.
   *
   * @default console.error
   */
  onNonLazyError?: (errorOrCloseEvent: unknown) => void;
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
   * by timing the resolution of the returned promise with the retries count.
   * `retries` argument counts actual connection attempts, so it will begin with
   * 0 after the first retryable disconnect.
   *
   * @default Randomised exponential backoff
   */
  retryWait?: (retries: number) => Promise<void>;
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
    onNonLazyError = console.error,
    keepAlive = 0,
    retryAttempts = 5,
    retryWait = async function randomisedExponentialBackoff(retries) {
      let retryDelay = 1000; // start with 1s delay
      for (let i = 0; i < retries; i++) {
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

  let connecting: Promise<WebSocket> | undefined,
    locks = 0,
    retrying = false,
    retries = 0,
    disposed = false;
  async function connect(): Promise<
    [
      socket: WebSocket,
      release: () => void,
      waitForReleaseOrThrowOnClose: Promise<void>,
    ]
  > {
    locks++;

    const socket = await (connecting ??
      (connecting = new Promise<WebSocket>((resolve, reject) =>
        (async () => {
          if (retrying) {
            await retryWait(retries);
            retries++;
          }

          emitter.emit('connecting');
          const socket = new WebSocketImpl(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);

          socket.onclose = (event) => {
            connecting = undefined;
            emitter.emit('closed', event);
            reject(event);
          };

          socket.onopen = async () => {
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
              socket.close(
                4400,
                err instanceof Error ? err.message : new Error(err).message,
              );
            }
          };

          socket.onmessage = ({ data }) => {
            socket.onmessage = null; // interested only in the first message
            try {
              const message = parseMessage(data);
              if (message.type !== MessageType.ConnectionAck) {
                throw new Error(
                  `First message cannot be of type ${message.type}`,
                );
              }
              emitter.emit('connected', socket, message.payload); // connected = socket opened + acknowledged
              retries = 0; // reset the retries on connect
              resolve(socket);
            } catch (err) {
              socket.close(
                4400,
                err instanceof Error ? err.message : new Error(err).message,
              );
            }
          };
        })(),
      )));

    let release = () => {
      // releases this connection lock
    };
    const released = new Promise<void>((resolve) => (release = resolve));

    return [
      socket,
      release,
      Promise.race([
        released.then(() => {
          if (--locks === 0) {
            // if no more connection locks are present, complete the connection
            const complete = () => socket.close(1000, 'Normal Closure');
            if (isFinite(keepAlive) && keepAlive > 0) {
              // if the keepalive is set, allow for the specified calmdown time and
              // then complete. but only if no lock got created in the meantime and
              // if the socket is still open
              setTimeout(() => {
                if (!locks && socket.readyState === WebSocketImpl.OPEN)
                  complete();
              }, keepAlive);
            } else {
              // otherwise complete immediately
              complete();
            }
          }
        }),
        new Promise<void>((resolve, reject) =>
          // avoid replacing the onclose above
          socket.addEventListener('close', (event) =>
            event.code === 1000
              ? // normal close is completion
                resolve()
              : // all other close events are fatal
                reject(event),
          ),
        ),
      ]),
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

    // disposed or normal closure (completed), shouldnt try again
    if (disposed || errOrCloseEvent.code === 1000) {
      return false;
    }

    // retries are not allowed or we tried to many times, report error
    if (!retryAttempts || retries >= retryAttempts) {
      throw errOrCloseEvent;
    }

    // looks good, start retrying
    retrying = true;
    return true;
  }

  // in non-lazy (hot?) mode always hold one connection lock to persist the socket
  if (!lazy) {
    (async () => {
      for (;;) {
        try {
          const [, , waitForReleaseOrThrowOnClose] = await connect();
          await waitForReleaseOrThrowOnClose;
          return; // completed, shouldnt try again
        } catch (errOrCloseEvent) {
          try {
            if (!shouldRetryConnectOrThrow(errOrCloseEvent))
              return onNonLazyError?.(errOrCloseEvent);
          } catch {
            // report thrown error, no further retries
            return onNonLazyError?.(errOrCloseEvent);
          }
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
      const releaserRef = {
        current: () => {
          // for handling completions before connect
          completed = true;
        },
      };

      function messageHandler({ data }: MessageEvent) {
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
              completed = true;
              sink.error(message.payload);
              releaserRef.current();
              // TODO-db-201025 calling releaser will complete the sink, meaning that both the `error` and `complete` will be
              // called. neither promises or observables care; once they settle, additional calls to the resolvers will be ignored
            }
            return;
          }
          case MessageType.Complete: {
            if (message.id === id) {
              completed = true;
              releaserRef.current(); // release completes the sink
            }
            return;
          }
        }
      }

      (async () => {
        for (;;) {
          try {
            const [
              socket,
              release,
              waitForReleaseOrThrowOnClose,
            ] = await connect();

            // if completed while waiting for connect, release the connection lock right away
            if (completed) return release();

            socket.addEventListener('message', messageHandler);

            socket.send(
              stringifyMessage<MessageType.Subscribe>({
                id: id,
                type: MessageType.Subscribe,
                payload,
              }),
            );

            releaserRef.current = () => {
              if (!completed) {
                // if not completed already, send complete message to server on release
                socket.send(
                  stringifyMessage<MessageType.Complete>({
                    id: id,
                    type: MessageType.Complete,
                  }),
                );
              }
              release();
            };

            // either the releaser will be called, connection completed and
            // the promise resolved or the socket closed and the promise rejected
            await waitForReleaseOrThrowOnClose;

            socket.removeEventListener('message', messageHandler);

            return; // completed, shouldnt try again
          } catch (errOrCloseEvent) {
            if (!shouldRetryConnectOrThrow(errOrCloseEvent)) return;
          }
        }
      })()
        .catch(sink.error)
        .then(sink.complete); // resolves on release or normal closure

      return () => releaserRef.current();
    },
    async dispose() {
      disposed = true;
      if (connecting) {
        // if there is a connection, close it
        const socket = await connecting;
        socket.close(1000, 'Normal Closure');
      }
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
