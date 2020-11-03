/**
 *
 * server
 *
 */

import * as http from 'http';
import * as WebSocket from 'ws';
import {
  OperationTypeNode,
  GraphQLSchema,
  ExecutionArgs,
  parse,
  validate,
  getOperationAST,
  GraphQLError,
  SubscriptionArgs,
  ExecutionResult,
} from 'graphql';
import { Disposable } from './types';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';
import {
  Message,
  MessageType,
  stringifyMessage,
  parseMessage,
  SubscribeMessage,
  NextMessage,
  ErrorMessage,
  CompleteMessage,
} from './message';
import {
  isObject,
  isAsyncIterable,
  hasOwnObjectProperty,
  hasOwnStringProperty,
  areGraphQLErrors,
} from './utils';
import { ID } from './types';

export type OperationResult =
  | Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>
  | AsyncIterableIterator<ExecutionResult>
  | ExecutionResult;

/**
 * A concrete GraphQL execution context value type.
 *
 * Mainly used because TypeScript collapes unions
 * with `any` or `unknown` to `any` or `unknown`. So,
 * we use a custom type to allow definitions such as
 * the `context` server option.
 */
export type GraphQLExecutionContextValue =
  // eslint-disable-next-line @typescript-eslint/ban-types
  | object // you can literally pass "any" JS object as the context value
  | symbol
  | number
  | string
  | boolean
  | null;

export interface ServerOptions {
  /**
   * The GraphQL schema on which the operations
   * will be executed and validated against.
   *
   * If the schema is left undefined, you're trusted to
   * provide one in the returned `ExecutionArgs` from the
   * `onSubscribe` callback.
   */
  schema?: GraphQLSchema;
  /**
   * A value which is provided to every resolver and holds
   * important contextual information like the currently
   * logged in user, or access to a database.
   *
   * If you return from `onSubscribe`, and the returned value is
   * missing the `contextValue` field, this context will be used
   * instead.
   *
   * If you use the function signature, the final execution arguments
   * will be passed in (also the returned value from `onSubscribe`).
   * Since the context is injected on every subscribe, the `SubscribeMessage`
   * with the regular `Context` will be passed in through the arguments too.
   */
  context?:
    | GraphQLExecutionContextValue
    | ((
        ctx: Context,
        message: SubscribeMessage,
        args: ExecutionArgs,
      ) => GraphQLExecutionContextValue);
  /**
   * The GraphQL root fields or resolvers to go
   * alongside the schema. Learn more about them
   * here: https://graphql.org/learn/execution/#root-fields-resolvers.
   *
   * If you return from the `onSubscribe` callback, the
   * root field value will NOT be injected. You should add it
   * in the returned `ExecutionArgs` from the callback.
   */
  roots?: {
    [operation in OperationTypeNode]?: Record<
      string,
      NonNullable<SubscriptionArgs['rootValue']>
    >;
  };
  /**
   * Is the `execute` function from GraphQL which is
   * used to execute the query and mutation operations.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  execute: (args: ExecutionArgs) => OperationResult;
  /**
   * Is the `subscribe` function from GraphQL which is
   * used to execute the subscription operation.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  subscribe: (args: ExecutionArgs) => OperationResult;
  /**
   * The amount of time for which the server will wait
   * for `ConnectionInit` message.
   *
   * Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.
   *
   * If the wait timeout has passed and the client
   * has not sent the `ConnectionInit` message,
   * the server will terminate the socket by
   * dispatching a close event `4408: Connection initialisation timeout`
   *
   * @default 3 * 1000 (3 seconds)
   */
  connectionInitWaitTimeout?: number;
  /**
   * The timout between dispatched keep-alive messages. Internally the lib
   * uses the [WebSocket Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets)) to check that the link between
   * the clients and the server is operating and to prevent the link from being broken due to idling.
   *
   * Set to nullish value to disable.
   *
   * @default 12 * 1000 (12 seconds)
   */
  keepAlive?: number;
  /**
   * Is the connection callback called when the
   * client requests the connection initialisation
   * through the message `ConnectionInit`.
   *
   * The message payload (`connectionParams` from the
   * client) is present in the `Context.connectionParams`.
   *
   * - Returning `true` or nothing from the callback will
   * allow the client to connect.
   *
   * - Returning `false` from the callback will
   * terminate the socket by dispatching the
   * close event `4403: Forbidden`.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onConnect?: (ctx: Context) => Promise<boolean | void> | boolean | void;
  /**
   * The subscribe callback executed right after
   * acknowledging the request before any payload
   * processing has been performed.
   *
   * If you return `ExecutionArgs` from the callback,
   * it will be used instead of trying to build one
   * internally. In this case, you are responsible
   * for providing a ready set of arguments which will
   * be directly plugged in the operation execution. Beware,
   * the `context` server option is an exception. Only if you
   * dont provide a context alongside the returned value
   * here, the `context` server option will be used instead.
   *
   * To report GraphQL errors simply return an array
   * of them from the callback, they will be reported
   * to the client through the error message.
   *
   * Useful for preparing the execution arguments
   * following a custom logic. A typical use case are
   * persisted queries, you can identify the query from
   * the subscribe message and create the GraphQL operation
   * execution args which are then returned by the function.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onSubscribe?: (
    ctx: Context,
    message: SubscribeMessage,
  ) =>
    | Promise<ExecutionArgs | readonly GraphQLError[] | void>
    | ExecutionArgs
    | readonly GraphQLError[]
    | void;
  /**
   * Executed after the operation call resolves. For streaming
   * operations, triggering this callback does not necessarely
   * mean that there is already a result available - it means
   * that the subscription process for the stream has resolved
   * and that the client is now subscribed.
   *
   * The `OperationResult` argument is the result of operation
   * execution. It can be an iterator or already a value.
   *
   * If you want the single result and the events from a streaming
   * operation, use the `onNext` callback.
   *
   * Use this callback to listen for subscribe operation and
   * execution result manipulation.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onOperation?: (
    ctx: Context,
    message: SubscribeMessage,
    args: ExecutionArgs,
    result: OperationResult,
  ) => Promise<OperationResult | void> | OperationResult | void;
  /**
   * Executed after an error occured right before it
   * has been dispatched to the client.
   *
   * Use this callback to format the outgoing GraphQL
   * errors before they reach the client.
   *
   * Returned result will be injected in the error message payload.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onError?: (
    ctx: Context,
    message: ErrorMessage,
    errors: readonly GraphQLError[],
  ) => Promise<readonly GraphQLError[] | void> | readonly GraphQLError[] | void;
  /**
   * Executed after an operation has emitted a result right before
   * that result has been sent to the client. Results from both
   * single value and streaming operations will appear in this callback.
   *
   * Use this callback if you want to format the execution result
   * before it reaches the client.
   *
   * Returned result will be injected in the next message payload.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onNext?: (
    ctx: Context,
    message: NextMessage,
    args: ExecutionArgs,
    result: ExecutionResult,
  ) => Promise<ExecutionResult | void> | ExecutionResult | void;
  /**
   * The complete callback is executed after the
   * operation has completed right before sending
   * the complete message to the client.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onComplete?: (ctx: Context, message: CompleteMessage) => Promise<void> | void;
}

export interface Context {
  /**
   * The actual WebSocket connection between the server and the client.
   */
  readonly socket: WebSocket;
  /**
   * The initial HTTP request before the actual
   * socket and connection is established.
   */
  readonly request: http.IncomingMessage;
  /**
   * Indicates that the `ConnectionInit` message
   * has been received by the server. If this is
   * `true`, the client wont be kicked off after
   * the wait timeout has passed.
   */
  connectionInitReceived: boolean;
  /**
   * Indicates that the connection was acknowledged
   * by having dispatched the `ConnectionAck` message
   * to the related client.
   */
  acknowledged: boolean;
  /** The parameters passed during the connection initialisation. */
  connectionParams?: Readonly<Record<string, unknown>>;
  /**
   * Holds the active subscriptions for this context.
   * Subscriptions are for **streaming operations only**,
   * those that resolve once wont be added here.
   */
  subscriptions: Record<ID, AsyncIterator<unknown>>;
}

export interface Server extends Disposable {
  webSocketServer: WebSocket.Server;
}

// for documentation gen only
type WebSocketServerOptions = WebSocket.ServerOptions;
type WebSocketServer = WebSocket.Server;

/**
 * Creates a protocol complient WebSocket GraphQL
 * subscription server. Read more about the protocol
 * in the PROTOCOL.md documentation file.
 */
export function createServer(
  options: ServerOptions,
  websocketOptionsOrServer: WebSocketServerOptions | WebSocketServer,
): Server {
  const isProd = process.env.NODE_ENV === 'production';

  const {
    schema,
    context,
    roots,
    execute,
    subscribe,
    connectionInitWaitTimeout = 3 * 1000, // 3 seconds
    keepAlive = 12 * 1000, // 12 seconds
    onConnect,
    onSubscribe,
    onOperation,
    onNext,
    onError,
    onComplete,
  } = options;
  const webSocketServer = isWebSocketServer(websocketOptionsOrServer)
    ? websocketOptionsOrServer
    : new WebSocket.Server(websocketOptionsOrServer);

  function handleConnection(socket: WebSocket, request: http.IncomingMessage) {
    if (
      socket.protocol === undefined ||
      socket.protocol !== GRAPHQL_TRANSPORT_WS_PROTOCOL ||
      (Array.isArray(socket.protocol) &&
        socket.protocol.indexOf(GRAPHQL_TRANSPORT_WS_PROTOCOL) === -1)
    ) {
      return socket.close(1002, 'Protocol Error');
    }

    const ctxRef: { current: Context } = {
      current: {
        socket,
        request,
        connectionInitReceived: false,
        acknowledged: false,
        subscriptions: {},
      },
    };

    // kick the client off (close socket) if the connection has
    // not been initialised after the specified wait timeout
    const connectionInitWait =
      connectionInitWaitTimeout && // even 0 disables it
      connectionInitWaitTimeout !== Infinity &&
      setTimeout(() => {
        if (!ctxRef.current.connectionInitReceived) {
          ctxRef.current.socket.close(
            4408,
            'Connection initialisation timeout',
          );
        }
      }, connectionInitWaitTimeout);

    // keep alive through ping-pong messages
    // read more about the websocket heartbeat here: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets
    let pongWait: NodeJS.Timeout | null;
    const pingInterval =
      keepAlive && // even 0 disables it
      keepAlive !== Infinity &&
      setInterval(() => {
        // ping pong on open sockets only
        if (socket.readyState === WebSocket.OPEN) {
          // terminate the connection after pong wait has passed because the client is idle
          pongWait = setTimeout(() => {
            socket.terminate();
          }, keepAlive);

          // listen for client's pong and stop socket termination
          socket.once('pong', () => {
            if (pongWait) {
              clearTimeout(pongWait);
              pongWait = null;
            }
          });

          socket.ping();
        }
      }, keepAlive);

    function errorOrCloseHandler(
      errorOrClose: WebSocket.ErrorEvent | WebSocket.CloseEvent,
    ) {
      if (connectionInitWait) {
        clearTimeout(connectionInitWait);
      }
      if (pongWait) {
        clearTimeout(pongWait);
      }
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      if (isErrorEvent(errorOrClose)) {
        ctxRef.current.socket.close(
          1011,
          isProd ? 'Internal Error' : errorOrClose.message,
        );
      }

      Object.entries(ctxRef.current.subscriptions).forEach(
        ([, subscription]) => {
          subscription.return?.();
        },
      );
    }

    socket.onerror = errorOrCloseHandler;
    socket.onclose = errorOrCloseHandler;
    socket.onmessage = makeOnMessage(ctxRef.current);
  }
  webSocketServer.on('connection', handleConnection);
  webSocketServer.on('error', (err) => {
    for (const client of webSocketServer.clients) {
      // report server errors by erroring out all clients with the same error
      client.emit('error', err);
    }
  });

  // Sends through a message only if the socket is open.
  async function sendMessage<T extends MessageType>(
    ctx: Context,
    message: Message<T>,
  ) {
    if (ctx.socket.readyState === WebSocket.OPEN) {
      return new Promise((resolve, reject) => {
        ctx.socket.send(stringifyMessage<T>(message), (err) =>
          err ? reject(err) : resolve(),
        );
      });
    }
  }

  function makeOnMessage(ctx: Context) {
    return async function onMessage(event: WebSocket.MessageEvent) {
      try {
        const message = parseMessage(event.data);
        switch (message.type) {
          case MessageType.ConnectionInit: {
            if (ctx.connectionInitReceived) {
              return ctx.socket.close(4429, 'Too many initialisation requests');
            }
            ctx.connectionInitReceived = true;

            if (isObject(message.payload)) {
              ctx.connectionParams = message.payload;
            }

            if (onConnect) {
              const permitted = await onConnect(ctx);
              if (permitted === false) {
                return ctx.socket.close(4403, 'Forbidden');
              }
            }

            await sendMessage<MessageType.ConnectionAck>(ctx, {
              type: MessageType.ConnectionAck,
            });

            ctx.acknowledged = true;
            break;
          }
          case MessageType.Subscribe: {
            if (!ctx.acknowledged) {
              return ctx.socket.close(4401, 'Unauthorized');
            }

            const emit = {
              next: async (result: ExecutionResult, args: ExecutionArgs) => {
                let nextMessage: NextMessage = {
                  id: message.id,
                  type: MessageType.Next,
                  payload: result,
                };
                if (onNext) {
                  const maybeResult = await onNext(
                    ctx,
                    nextMessage,
                    args,
                    result,
                  );
                  if (maybeResult) {
                    nextMessage = {
                      ...nextMessage,
                      payload: maybeResult,
                    };
                  }
                }
                await sendMessage<MessageType.Next>(ctx, nextMessage);
              },
              error: async (errors: readonly GraphQLError[]) => {
                let errorMessage: ErrorMessage = {
                  id: message.id,
                  type: MessageType.Error,
                  payload: errors,
                };
                if (onError) {
                  const maybeErrors = await onError(ctx, errorMessage, errors);
                  if (maybeErrors) {
                    errorMessage = {
                      ...errorMessage,
                      payload: maybeErrors,
                    };
                  }
                }
                await sendMessage<MessageType.Error>(ctx, errorMessage);
              },
              complete: async () => {
                const completeMessage: CompleteMessage = {
                  id: message.id,
                  type: MessageType.Complete,
                };
                await onComplete?.(ctx, completeMessage);
                await sendMessage<MessageType.Complete>(ctx, completeMessage);
              },
            };

            let execArgs: ExecutionArgs;
            const maybeExecArgsOrErrors = await onSubscribe?.(ctx, message);
            if (maybeExecArgsOrErrors) {
              if (areGraphQLErrors(maybeExecArgsOrErrors)) {
                return await emit.error(maybeExecArgsOrErrors);
              }
              // not errors, is exec args
              execArgs = maybeExecArgsOrErrors;
            } else {
              if (!schema) {
                // you either provide a schema dynamically through
                // `onSubscribe` or you set one up during the server setup
                return webSocketServer.emit(
                  'error',
                  new Error('The GraphQL schema is not provided'),
                );
              }

              const { operationName, query, variables } = message.payload;
              const document = typeof query === 'string' ? parse(query) : query;
              execArgs = {
                schema,
                operationName,
                document,
                variableValues: variables,
              };

              const validationErrors = validate(
                execArgs.schema,
                execArgs.document,
              );
              if (validationErrors.length > 0) {
                return await emit.error(validationErrors);
              }
            }

            const operationAST = getOperationAST(
              execArgs.document,
              execArgs.operationName,
            );
            if (!operationAST) {
              return await emit.error([
                new GraphQLError('Unable to identify operation'),
              ]);
            }

            // if onsubscribe didnt return anything, inject roots
            if (!maybeExecArgsOrErrors) {
              execArgs.rootValue = roots?.[operationAST.operation];
            }

            // inject the context, if provided, before the operation.
            // but, only if the `onSubscribe` didnt provide one already
            if (context !== undefined && !execArgs.contextValue) {
              execArgs.contextValue =
                typeof context === 'function'
                  ? context(ctx, message, execArgs)
                  : context;
            }

            // the execution arguments have been prepared
            // perform the operation and act accordingly
            let operationResult;
            if (operationAST.operation === 'subscription') {
              operationResult = await subscribe(execArgs);
            } else {
              // operation === 'query' || 'mutation'
              operationResult = await execute(execArgs);
            }

            if (onOperation) {
              const maybeResult = await onOperation(
                ctx,
                message,
                execArgs,
                operationResult,
              );
              if (maybeResult) {
                operationResult = maybeResult;
              }
            }

            if (isAsyncIterable(operationResult)) {
              /** multiple emitted results */

              // iterable subscriptions are distinct on ID
              if (ctx.subscriptions[message.id]) {
                return ctx.socket.close(
                  4409,
                  `Subscriber for ${message.id} already exists`,
                );
              }
              ctx.subscriptions[message.id] = operationResult;

              for await (const result of operationResult) {
                await emit.next(result, execArgs);
              }
              await emit.complete();
              delete ctx.subscriptions[message.id];
            } else {
              /** single emitted result */

              await emit.next(operationResult, execArgs);
              await emit.complete();
            }
            break;
          }
          case MessageType.Complete: {
            await ctx.subscriptions[message.id]?.return?.();
            break;
          }
          default:
            throw new Error(
              `Unexpected message of type ${message.type} received`,
            );
        }
      } catch (err) {
        // TODO-db-201031 we perceive this as a client bad request error, but is it always?
        ctx.socket.close(4400, err.message);
      }
    };
  }

  return {
    webSocketServer,
    dispose: async () => {
      for (const client of webSocketServer.clients) {
        client.close(1001, 'Going away');
      }

      webSocketServer.removeAllListeners();

      await new Promise((resolve, reject) =>
        webSocketServer.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

function isErrorEvent(obj: unknown): obj is WebSocket.ErrorEvent {
  return (
    isObject(obj) &&
    hasOwnObjectProperty(obj, 'error') &&
    hasOwnStringProperty(obj, 'message') &&
    hasOwnStringProperty(obj, 'type')
  );
}

function isWebSocketServer(obj: unknown): obj is WebSocketServer {
  return isObject(obj) && typeof obj.on === 'function';
}
