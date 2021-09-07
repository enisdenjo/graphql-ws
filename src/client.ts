/**
 *
 * client
 *
 */

import { ExecutionResult } from 'graphql';
import {
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  CloseCode,
  Sink,
  ID,
  Disposable,
  Message,
  MessageType,
  ConnectionInitMessage,
  ConnectionAckMessage,
  PingMessage,
  PongMessage,
  parseMessage,
  stringifyMessage,
  SubscribePayload,
  JSONMessageReviver,
  JSONMessageReplacer,
} from './common';
import { isObject } from './utils';

/** This file is the entry point for browsers, re-export common elements. */
export * from './common';

/**
 * WebSocket started connecting.
 *
 * @category Client
 */
export type EventConnecting = 'connecting';

/**
 * WebSocket has opened.
 *
 * @category Client
 */
export type EventOpened = 'opened';

/**
 * Open WebSocket connection has been acknowledged.
 *
 * @category Client
 */
export type EventConnected = 'connected';

/**
 * `PingMessage` has been received or sent.
 *
 * @category Client
 */
export type EventPing = 'ping';

/**
 * `PongMessage` has been received or sent.
 *
 * @category Client
 */
export type EventPong = 'pong';

/**
 * A message has been received.
 *
 * @category Client
 */
export type EventMessage = 'message';

/**
 * WebSocket connection has closed.
 *
 * @category Client
 */
export type EventClosed = 'closed';

/**
 * WebSocket connection had an error.
 *
 * @category Client
 */
export type EventError = 'error';

/**
 * All events that could occur.
 *
 * @category Client
 */
export type Event =
  | EventConnecting
  | EventOpened
  | EventConnected
  | EventPing
  | EventPong
  | EventMessage
  | EventClosed
  | EventError;

/** @category Client */
export type EventConnectingListener = () => void;

/**
 * The first argument is actually the `WebSocket`, but to avoid
 * bundling DOM typings because the client can run in Node env too,
 * you should assert the websocket type during implementation.
 *
 * @category Client
 */
export type EventOpenedListener = (socket: unknown) => void;

/**
 * The first argument is actually the `WebSocket`, but to avoid
 * bundling DOM typings because the client can run in Node env too,
 * you should assert the websocket type during implementation.
 *
 * Also, the second argument is the optional payload that the server may
 * send through the `ConnectionAck` message.
 *
 * @category Client
 */
export type EventConnectedListener = (
  socket: unknown,
  payload: ConnectionAckMessage['payload'],
) => void;

/**
 * The first argument communicates whether the ping was received from the server.
 * If `false`, the ping was sent by the client.
 *
 * @category Client
 */
export type EventPingListener = (
  received: boolean,
  payload: PingMessage['payload'],
) => void;

/**
 * The first argument communicates whether the pong was received from the server.
 * If `false`, the pong was sent by the client.
 *
 * @category Client
 */
export type EventPongListener = (
  received: boolean,
  payload: PongMessage['payload'],
) => void;

/**
 * Called for all **valid** messages received by the client. Mainly useful for
 * debugging and logging received messages.
 *
 * @category Client
 */
export type EventMessageListener = (message: Message) => void;

/**
 * The argument is actually the websocket `CloseEvent`, but to avoid
 * bundling DOM typings because the client can run in Node env too,
 * you should assert the websocket type during implementation.
 *
 * @category Client
 */
export type EventClosedListener = (event: unknown) => void;

/**
 * The argument can be either an Error Event or an instance of Error, but to avoid
 * bundling DOM typings because the client can run in Node env too, you should assert
 * the type during implementation. Events dispatched from the WebSocket `onerror` can
 * be handler in this listener.
 *
 * @category Client
 */
export type EventErrorListener = (error: unknown) => void;

/** @category Client */
export type EventListener<E extends Event> = E extends EventConnecting
  ? EventConnectingListener
  : E extends EventOpened
  ? EventOpenedListener
  : E extends EventConnected
  ? EventConnectedListener
  : E extends EventPing
  ? EventPingListener
  : E extends EventPong
  ? EventPongListener
  : E extends EventMessage
  ? EventMessageListener
  : E extends EventClosed
  ? EventClosedListener
  : E extends EventError
  ? EventErrorListener
  : never;

/**
 * Configuration used for the GraphQL over WebSocket client.
 *
 * @category Client
 */
export interface ClientOptions {
  /**
   * URL of the GraphQL over WebSocket Protocol compliant server to connect.
   *
   * If the option is a function, it will be called on every WebSocket connection attempt.
   * Returning a promise is supported too and the connecting phase will stall until it
   * resolves with the URL.
   *
   * A good use-case for having a function is when using the URL for authentication,
   * where subsequent reconnects (due to auth) may have a refreshed identity token in
   * the URL.
   */
  url: string | (() => Promise<string> | string);
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
    | ConnectionInitMessage['payload']
    | (() =>
        | Promise<ConnectionInitMessage['payload']>
        | ConnectionInitMessage['payload']);
  /**
   * Controls when should the connection be established.
   *
   * - `false`: Establish a connection immediately. Use `onNonLazyError` to handle errors.
   * - `true`: Establish a connection on first subscribe and close on last unsubscribe. Use
   * the subscription sink's `error` to handle errors.
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
  lazyCloseTimeout?: number;
  /**
   * The timout between dispatched keep-alive messages, naimly server pings. Internally
   * dispatches the `PingMessage` type to the server and expects a `PongMessage` in response.
   * This helps with making sure that the connection with the server is alive and working.
   *
   * Timeout countdown starts from the moment the socket was opened and subsequently
   * after every received `PongMessage`.
   *
   * Note that NOTHING will happen automatically with the client if the server never
   * responds to a `PingMessage` with a `PongMessage`. If you want the connection to close,
   * you should implement your own logic on top of the client. A simple example looks like this:
   *
   * ```js
   * import { createClient } from 'graphql-ws';
   *
   * let activeSocket, timedOut;
   * createClient({
   *   url: 'ws://i.time.out:4000/after-5/seconds',
   *   keepAlive: 10_000, // ping server every 10 seconds
   *   on: {
   *     connected: (socket) => (activeSocket = socket),
   *     ping: (received) => {
   *       if (!received) // sent
   *         timedOut = setTimeout(() => {
   *           if (activeSocket.readyState === WebSocket.OPEN)
   *             activeSocket.close(4408, 'Request Timeout');
   *         }, 5_000); // wait 5 seconds for the pong and then close the connection
   *     },
   *     pong: (received) => {
   *       if (received) clearTimeout(timedOut); // pong is received, clear connection close timeout
   *     },
   *   },
   * });
   * ```
   *
   * @default 0
   */
  keepAlive?: number;
  /**
   * The amount of time for which the client will wait
   * for `ConnectionAck` message.
   *
   * Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.
   *
   * If the wait timeout has passed and the server
   * has not responded with `ConnectionAck` message,
   * the client will terminate the socket by
   * dispatching a close event `4418: Connection acknowledgement timeout`
   *
   * @default 0
   */
  connectionAckWaitTimeout?: number;
  /**
   * Disable sending the `PongMessage` automatically.
   *
   * Useful for when integrating your own custom client pinger that performs
   * custom actions before responding to a ping, or to pass along the optional pong
   * message payload. Please check the readme recipes for a concrete example.
   */
  disablePong?: boolean;
  /**
   * How many times should the client try to reconnect on abnormal socket closure before it errors out?
   *
   * The library classifies the following close events as fatal:
   * - _All internal WebSocket fatal close codes (check `isFatalInternalCloseCode` in `src/client.ts` for exact list)_
   * - `4500: Internal server error`
   * - `4400: Bad request`
   * - `4401: Unauthorized` _tried subscribing before connect ack_
   * - `4406: Subprotocol not acceptable`
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
   * Check if the close event or connection error is fatal. If you return `true`,
   * the client will fail immediately without additional retries; however, if you
   * return `false`, the client will keep retrying until the `retryAttempts` have
   * been exceeded.
   *
   * The argument is either a WebSocket `CloseEvent` or an error thrown during
   * the connection phase.
   *
   * Beware, the library classifies a few close events as fatal regardless of
   * what is returned. They are listed in the documentation of the `retryAttempts`
   * option.
   *
   * @default Non close events
   */
  isFatalConnectionProblem?: (errOrCloseEvent: unknown) => boolean;
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
   * Reference: https://gist.github.com/jed/982883
   */
  generateID?: () => ID;
  /**
   * An optional override for the JSON.parse function used to hydrate
   * incoming messages to this client. Useful for parsing custom datatypes
   * out of the incoming JSON.
   */
  jsonMessageReviver?: JSONMessageReviver;
  /**
   * An optional override for the JSON.stringify function used to serialize
   * outgoing messages from this client. Useful for serializing custom
   * datatypes out to the client.
   */
  jsonMessageReplacer?: JSONMessageReplacer;
}

/** @category Client */
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
  subscribe<Data = Record<string, unknown>, Extensions = unknown>(
    payload: SubscribePayload,
    sink: Sink<ExecutionResult<Data, Extensions>>,
  ): () => void;
}

/**
 * Creates a disposable GraphQL over WebSocket client.
 *
 * @category Client
 */
export function createClient(options: ClientOptions): Client {
  const {
    url,
    connectionParams,
    lazy = true,
    onNonLazyError = console.error,
    lazyCloseTimeout = 0,
    keepAlive = 0,
    disablePong,
    connectionAckWaitTimeout = 0,
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
    isFatalConnectionProblem = (errOrCloseEvent) =>
      // non `CloseEvent`s are fatal by default
      !isLikeCloseEvent(errOrCloseEvent),
    on,
    webSocketImpl,
    /**
     * Generates a v4 UUID to be used as the ID using `Math`
     * as the random number generator. Supply your own generator
     * in case you need more uniqueness.
     *
     * Reference: https://gist.github.com/jed/982883
     */
    generateID = function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
    jsonMessageReplacer: replacer,
    jsonMessageReviver: reviver,
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
  if (!ws) throw new Error('WebSocket implementation missing');
  const WebSocketImpl = ws;

  // websocket status emitter, subscriptions are handled differently
  const emitter = (() => {
    const message = (() => {
      const listeners: { [key: string]: EventMessageListener } = {};
      return {
        on(id: string, listener: EventMessageListener) {
          listeners[id] = listener;
          return () => {
            delete listeners[id];
          };
        },
        emit(message: Message) {
          if ('id' in message) listeners[message.id]?.(message);
        },
      };
    })();
    const listeners: { [event in Event]: EventListener<event>[] } = {
      connecting: on?.connecting ? [on.connecting] : [],
      opened: on?.opened ? [on.opened] : [],
      connected: on?.connected ? [on.connected] : [],
      ping: on?.ping ? [on.ping] : [],
      pong: on?.pong ? [on.pong] : [],
      message: on?.message ? [message.emit, on.message] : [message.emit],
      closed: on?.closed ? [on.closed] : [],
      error: on?.error ? [on.error] : [],
    };

    return {
      onMessage: message.on,
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
    };
  })();

  type Connected = [socket: WebSocket, throwOnClose: Promise<void>];
  let connecting: Promise<Connected> | undefined,
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
    const [socket, throwOnClose] = await (connecting ??
      (connecting = new Promise<Connected>((connected, denied) =>
        (async () => {
          if (retrying) {
            await retryWait(retries);

            // subscriptions might complete while waiting for retry
            if (!locks) {
              connecting = undefined;
              return denied({ code: 1000, reason: 'All Subscriptions Gone' });
            }

            retries++;
          }

          emitter.emit('connecting');
          const socket = new WebSocketImpl(
            typeof url === 'function' ? await url() : url,
            GRAPHQL_TRANSPORT_WS_PROTOCOL,
          );

          let connectionAckTimeout: ReturnType<typeof setTimeout>,
            queuedPing: ReturnType<typeof setTimeout>;
          function enqueuePing() {
            if (isFinite(keepAlive) && keepAlive > 0) {
              clearTimeout(queuedPing); // in case where a pong was received before a ping (this is valid behaviour)
              queuedPing = setTimeout(() => {
                if (socket.readyState === WebSocketImpl.OPEN) {
                  socket.send(stringifyMessage({ type: MessageType.Ping }));
                  emitter.emit('ping', false, undefined);
                }
              }, keepAlive);
            }
          }

          socket.onerror = (err) => {
            // we let the onclose reject the promise for correct retry handling
            emitter.emit('error', err);
          };

          socket.onclose = (event) => {
            connecting = undefined;
            clearTimeout(connectionAckTimeout);
            clearTimeout(queuedPing);
            emitter.emit('closed', event);
            denied(event);
          };

          socket.onopen = async () => {
            try {
              emitter.emit('opened', socket);
              const payload =
                typeof connectionParams === 'function'
                  ? await connectionParams()
                  : connectionParams;
              socket.send(
                stringifyMessage<MessageType.ConnectionInit>(
                  payload
                    ? {
                        type: MessageType.ConnectionInit,
                        payload,
                      }
                    : {
                        type: MessageType.ConnectionInit,
                        // payload is completely absent if not provided
                      },
                  replacer,
                ),
              );

              if (
                isFinite(connectionAckWaitTimeout) &&
                connectionAckWaitTimeout > 0
              ) {
                connectionAckTimeout = setTimeout(() => {
                  socket.close(
                    CloseCode.ConnectionAcknowledgementTimeout,
                    'Connection acknowledgement timeout',
                  );
                }, connectionAckWaitTimeout);
              }

              enqueuePing(); // enqueue ping (noop if disabled)
            } catch (err) {
              socket.close(
                CloseCode.BadRequest,
                err instanceof Error ? err.message : new Error(err).message,
              );
            }
          };

          let acknowledged = false;
          socket.onmessage = ({ data }) => {
            try {
              const message = parseMessage(data, reviver);
              emitter.emit('message', message);
              if (message.type === 'ping' || message.type === 'pong') {
                emitter.emit(message.type, true, message.payload); // received
                if (message.type === 'pong') {
                  enqueuePing(); // enqueue next ping (noop if disabled)
                } else if (!disablePong) {
                  // respond with pong on ping
                  socket.send(
                    stringifyMessage(
                      message.payload
                        ? {
                            type: MessageType.Pong,
                            payload: message.payload,
                          }
                        : {
                            type: MessageType.Pong,
                            // payload is completely absent if not provided
                          },
                    ),
                  );
                  emitter.emit('pong', false, message.payload);
                }
                return; // ping and pongs can be received whenever
              }
              if (acknowledged) return; // already connected and acknowledged

              if (message.type !== MessageType.ConnectionAck)
                throw new Error(
                  `First message cannot be of type ${message.type}`,
                );
              clearTimeout(connectionAckTimeout);
              acknowledged = true;
              emitter.emit('connected', socket, message.payload); // connected = socket opened + acknowledged
              retrying = false; // future lazy connects are not retries
              retries = 0; // reset the retries on connect
              connected([
                socket,
                new Promise<void>((_, closed) =>
                  socket.addEventListener('close', closed),
                ),
              ]);
            } catch (err) {
              socket.close(
                CloseCode.BadRequest,
                err instanceof Error ? err.message : new Error(err).message,
              );
            }
          };
        })(),
      )));

    // if the provided socket is in a closing state, wait for the throw on close
    if (socket.readyState === WebSocketImpl.CLOSING) await throwOnClose;

    let release = () => {
      // releases this connection
    };
    const released = new Promise<void>((resolve) => (release = resolve));

    return [
      socket,
      release,
      Promise.race([
        // wait for
        released.then(() => {
          if (!locks) {
            // and if no more locks are present, complete the connection
            const complete = () => socket.close(1000, 'Normal Closure');
            if (isFinite(lazyCloseTimeout) && lazyCloseTimeout > 0) {
              // if the keepalive is set, allow for the specified calmdown time and
              // then complete. but only if no lock got created in the meantime and
              // if the socket is still open
              setTimeout(() => {
                if (!locks && socket.readyState === WebSocketImpl.OPEN)
                  complete();
              }, lazyCloseTimeout);
            } else {
              // otherwise complete immediately
              complete();
            }
          }
        }),
        // or
        throwOnClose,
      ]),
    ];
  }

  /**
   * Checks the `connect` problem and evaluates if the client should retry.
   */
  function shouldRetryConnectOrThrow(errOrCloseEvent: unknown): boolean {
    // some close codes are worth reporting immediately
    if (
      isLikeCloseEvent(errOrCloseEvent) &&
      (isFatalInternalCloseCode(errOrCloseEvent.code) ||
        [
          CloseCode.InternalServerError,
          CloseCode.BadRequest,
          CloseCode.Unauthorized,
          // CloseCode.Forbidden, might grant access out after retry
          CloseCode.SubprotocolNotAcceptable,
          // CloseCode.ConnectionInitialisationTimeout, might not time out after retry
          // CloseCode.ConnectionAcknowledgementTimeout, might not time out after retry
          CloseCode.SubscriberAlreadyExists,
          CloseCode.TooManyInitialisationRequests,
        ].includes(errOrCloseEvent.code))
    )
      throw errOrCloseEvent;

    // client was disposed, no retries should proceed regardless
    if (disposed) return false;

    // normal closure (possibly all subscriptions have completed)
    // if no locks were acquired in the meantime, shouldnt try again
    if (isLikeCloseEvent(errOrCloseEvent) && errOrCloseEvent.code === 1000)
      return locks > 0;

    // retries are not allowed or we tried to many times, report error
    if (!retryAttempts || retries >= retryAttempts) throw errOrCloseEvent;

    // throw fatal connection problems immediately
    if (isFatalConnectionProblem(errOrCloseEvent)) throw errOrCloseEvent;

    // looks good, start retrying
    return (retrying = true);
  }

  // in non-lazy (hot?) mode always hold one connection lock to persist the socket
  if (!lazy) {
    (async () => {
      locks++;
      for (;;) {
        try {
          const [, , throwOnClose] = await connect();
          await throwOnClose; // will always throw because releaser is not used
        } catch (errOrCloseEvent) {
          try {
            if (!shouldRetryConnectOrThrow(errOrCloseEvent)) return;
          } catch (errOrCloseEvent) {
            // report thrown error, no further retries
            return onNonLazyError?.(errOrCloseEvent);
          }
        }
      }
    })();
  }

  return {
    on: emitter.on,
    subscribe(payload, sink) {
      const id = generateID();

      let done = false,
        errored = false,
        releaser = () => {
          // for handling completions before connect
          locks--;
          done = true;
        };

      (async () => {
        locks++;
        for (;;) {
          try {
            const [socket, release, waitForReleaseOrThrowOnClose] =
              await connect();

            // if done while waiting for connect, release the connection lock right away
            if (done) return release();

            const unlisten = emitter.onMessage(id, (message) => {
              switch (message.type) {
                case MessageType.Next: {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sink.next(message.payload as any);
                  return;
                }
                case MessageType.Error: {
                  (errored = true), (done = true);
                  sink.error(message.payload);
                  releaser();
                  return;
                }
                case MessageType.Complete: {
                  done = true;
                  releaser(); // release completes the sink
                  return;
                }
              }
            });

            socket.send(
              stringifyMessage<MessageType.Subscribe>(
                {
                  id,
                  type: MessageType.Subscribe,
                  payload,
                },
                replacer,
              ),
            );

            releaser = () => {
              if (!done && socket.readyState === WebSocketImpl.OPEN)
                // if not completed already and socket is open, send complete message to server on release
                socket.send(
                  stringifyMessage<MessageType.Complete>(
                    {
                      id,
                      type: MessageType.Complete,
                    },
                    replacer,
                  ),
                );
              locks--;
              done = true;
              release();
            };

            // either the releaser will be called, connection completed and
            // the promise resolved or the socket closed and the promise rejected.
            // whatever happens though, we want to stop listening for messages
            await waitForReleaseOrThrowOnClose.finally(unlisten);

            return; // completed, shouldnt try again
          } catch (errOrCloseEvent) {
            if (!shouldRetryConnectOrThrow(errOrCloseEvent)) return;
          }
        }
      })()
        .catch(sink.error) // rejects on close events and errors
        .then(() => {
          // delivering either an error or a complete terminates the sequence
          if (!errored) sink.complete();
        }); // resolves on release or normal closure

      return () => {
        // dispose only of active subscriptions
        if (!done) releaser();
      };
    },
    async dispose() {
      disposed = true;
      if (connecting) {
        // if there is a connection, close it
        const [socket] = await connecting;
        socket.close(1000, 'Normal Closure');
      }
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

function isFatalInternalCloseCode(code: number): boolean {
  if (
    [
      1000, // Normal Closure is not an erroneous close code
      1001, // Going Away
      1006, // Abnormal Closure
      1005, // No Status Received
      1012, // Service Restart
      1013, // Try Again Later
      1013, // Bad Gateway
    ].includes(code)
  )
    return false;
  // all other internal errors are fatal
  return code >= 1000 && code <= 1999;
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
