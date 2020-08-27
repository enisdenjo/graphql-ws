/**
 *
 * server
 *
 */

import * as http from 'http';
import * as WebSocket from 'ws';
import {
  GraphQLSchema,
  ValidationRule,
  ExecutionResult,
  ExecutionArgs,
  parse,
  validate,
  getOperationAST,
  subscribe,
  GraphQLError,
} from 'graphql';
import { Disposable } from './types';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';
import {
  Message,
  MessageType,
  parseMessage,
  SubscribeMessage,
  CompleteMessage,
  stringifyMessage,
} from './message';
import {
  Optional,
  isObject,
  isAsyncIterable,
  hasOwnObjectProperty,
  hasOwnStringProperty,
  noop,
} from './utils';
import { UUID } from './types';

export type ExecutionResultFormatter = (
  ctx: Context,
  result: ExecutionResult,
) => Promise<ExecutionResult> | ExecutionResult;

export interface ServerOptions {
  /**
   * The GraphQL schema on which the operations
   * will be executed and validated against. If
   * the schema is left undefined, one must be
   * provided by in the resulting `ExecutionArgs`
   * from the `onSubscribe` callback.
   */
  schema?: GraphQLSchema;
  /**
   * Is the `subscribe` function
   * from GraphQL which is used to
   * execute the subscription operation
   * upon.
   */
  execute: (args: ExecutionArgs) => Promise<ExecutionResult> | ExecutionResult;
  /**
   * Is the `subscribe` function
   * from GraphQL which is used to
   * execute the subscription operation
   * upon.
   */
  subscribe: (
    args: ExecutionArgs,
  ) => Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>;
  /**
   * Is the connection callback called when the
   * client requests the connection initialisation
   * through the message `ConnectionInit`. The message
   * payload (`connectionParams` on the client) is
   * present in the `Context.connectionParams`.
   *
   * - Returning `true` from the callback will
   * allow the client to connect.
   *
   * - Returning `false` from the callback will
   * terminate the socket by dispatching the
   * close event `4403: Forbidden`.
   *
   * - Throwing an error from the callback will
   * terminate the socket by dispatching the
   * close event `4400: <error-message>`, where
   * the `<error-message>` is the message of the
   * thrown `Error`.
   */
  onConnect?: (ctx: Context) => Promise<boolean> | boolean;
  /**
   * @default 3 * 1000 (3 seconds)
   *
   * The amount of time for which the
   * server will wait for `ConnectionInit` message.
   *
   * Set the value to `Infinity`, '', 0, null or undefined to skip waiting.
   *
   * If the wait timeout has passed and the client
   * has not sent the `ConnectionInit` message,
   * the server will terminate the socket by
   * dispatching a close event `4408: Connection initialisation timeout`
   */
  connectionInitWaitTimeout?: number;
  /**
   * Custom validation rules overriding all
   * validation rules defined by the GraphQL spec.
   */
  validationRules?: readonly ValidationRule[];
  /**
   * Format the operation execution results
   * if the implementation requires an adjusted
   * result. This formatter is run BEFORE the
   * `onConnect` scoped formatter.
   */
  formatExecutionResult?: ExecutionResultFormatter;
  /**
   * The subscribe callback executed before
   * the actual operation execution. Useful
   * for manipulating the execution arguments
   * before the doing the operation. As a second
   * item in the array, you can pass in a scoped
   * execution result formatter. This formatter
   * is run AFTER the root `formatExecutionResult`.
   */
  onSubscribe?: (
    ctx: Context,
    message: SubscribeMessage,
    args: Optional<ExecutionArgs, 'schema'>,
  ) =>
    | Promise<[ExecutionArgs, ExecutionResultFormatter?]>
    | [ExecutionArgs, ExecutionResultFormatter?];
  /**
   * The complete callback is executed after the
   * operation has completed or the subscription
   * has been closed.
   */
  onComplete?: (ctx: Context, message: CompleteMessage) => void;
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
   * Subscriptions are for `subscription` operations **only**,
   * other operations (`query`/`mutation`) are resolved immediately.
   */
  subscriptions: Record<UUID, AsyncIterator<unknown>>;
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
  const {
    schema,
    execute,
    onConnect,
    connectionInitWaitTimeout = 3 * 1000, // 3 seconds
    validationRules,
    formatExecutionResult,
    onSubscribe,
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
      // 1002: Protocol Error
      socket.close(1002, 'Protocol Error');
      return;
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

    function errorOrCloseHandler(
      errorOrClose: WebSocket.ErrorEvent | WebSocket.CloseEvent,
    ) {
      if (connectionInitWait) {
        clearTimeout(connectionInitWait);
      }

      if (isErrorEvent(errorOrClose)) {
        // TODO-db-200805 leaking sensitive information by sending the error message too?
        // 1011: Internal Error
        ctxRef.current.socket.close(1011, errorOrClose.message);
      }

      Object.entries(ctxRef.current.subscriptions).forEach(
        ([, subscription]) => {
          (subscription.return || noop)();
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
  function sendMessage<T extends MessageType>(
    ctx: Context,
    message: Message<T>,
    callback?: (err?: Error) => void,
  ) {
    return new Promise((resolve, reject) => {
      if (ctx.socket.readyState === WebSocket.OPEN) {
        try {
          ctx.socket.send(stringifyMessage<T>(message), (err) => {
            if (callback) callback(err);
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        } catch (err) {
          reject(err);
        }
      } else {
        if (callback) callback();
        resolve();
      }
    });
  }

  function makeOnMessage(ctx: Context) {
    return async function (event: WebSocket.MessageEvent) {
      try {
        const message = parseMessage(event.data);
        switch (message.type) {
          case MessageType.ConnectionInit: {
            ctx.connectionInitReceived = true;

            if (isObject(message.payload)) {
              ctx.connectionParams = message.payload;
            }

            if (onConnect) {
              const permitted = await onConnect(ctx);
              if (!permitted) {
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

            const operation = message.payload;

            let execArgsMaybeSchema: Optional<ExecutionArgs, 'schema'> = {
              schema,
              operationName: operation.operationName,
              document:
                typeof operation.query === 'string'
                  ? parse(operation.query)
                  : operation.query,
              variableValues: operation.variables,
            };

            let onSubscribeFormatter: ExecutionResultFormatter | undefined;
            if (onSubscribe) {
              [execArgsMaybeSchema, onSubscribeFormatter] = await onSubscribe(
                ctx,
                message,
                execArgsMaybeSchema,
              );
            }
            if (!execArgsMaybeSchema.schema) {
              // not providing a schema is a fatal server error
              return webSocketServer.emit(
                'error',
                new Error('The GraphQL schema is not provided'),
              );
            }

            // the execution arguments should be complete now
            const execArgs = execArgsMaybeSchema as ExecutionArgs;

            // validate
            const validationErrors = validate(
              execArgs.schema,
              execArgs.document,
              validationRules,
            );
            if (validationErrors.length > 0) {
              return await sendMessage<MessageType.Error>(ctx, {
                id: message.id,
                type: MessageType.Error,
                payload: validationErrors,
              });
            }

            // execute
            const operationAST = getOperationAST(
              execArgs.document,
              execArgs.operationName,
            );
            if (!operationAST) {
              throw new Error('Unable to get operation AST');
            }
            if (operationAST.operation === 'subscription') {
              const subscriptionOrResult = await subscribe(execArgs);
              if (isAsyncIterable(subscriptionOrResult)) {
                ctx.subscriptions[message.id] = subscriptionOrResult;

                try {
                  for await (let result of subscriptionOrResult) {
                    // use the root formater first
                    if (formatExecutionResult) {
                      result = await formatExecutionResult(ctx, result);
                    }
                    // then use the subscription specific formatter
                    if (onSubscribeFormatter) {
                      result = await onSubscribeFormatter(ctx, result);
                    }
                    await sendMessage<MessageType.Next>(ctx, {
                      id: message.id,
                      type: MessageType.Next,
                      payload: result,
                    });
                  }

                  const completeMessage: CompleteMessage = {
                    id: message.id,
                    type: MessageType.Complete,
                  };
                  await sendMessage<MessageType.Complete>(ctx, completeMessage);
                  if (onComplete) {
                    onComplete(ctx, completeMessage);
                  }
                } catch (err) {
                  await sendMessage<MessageType.Error>(ctx, {
                    id: message.id,
                    type: MessageType.Error,
                    payload: [
                      new GraphQLError(
                        err instanceof Error
                          ? err.message
                          : new Error(err).message,
                      ),
                    ],
                  });
                } finally {
                  delete ctx.subscriptions[message.id];
                }
              } else {
                let result = subscriptionOrResult;
                // use the root formater first
                if (formatExecutionResult) {
                  result = await formatExecutionResult(ctx, result);
                }
                // then use the subscription specific formatter
                if (onSubscribeFormatter) {
                  result = await onSubscribeFormatter(ctx, result);
                }
                await sendMessage<MessageType.Next>(ctx, {
                  id: message.id,
                  type: MessageType.Next,
                  payload: result,
                });

                const completeMessage: CompleteMessage = {
                  id: message.id,
                  type: MessageType.Complete,
                };
                await sendMessage<MessageType.Complete>(ctx, completeMessage);
                if (onComplete) {
                  onComplete(ctx, completeMessage);
                }
              }
            } else {
              // operationAST.operation === 'query' || 'mutation'

              let result = await execute(execArgs);
              // use the root formater first
              if (formatExecutionResult) {
                result = await formatExecutionResult(ctx, result);
              }
              // then use the subscription specific formatter
              if (onSubscribeFormatter) {
                result = await onSubscribeFormatter(ctx, result);
              }
              await sendMessage<MessageType.Next>(ctx, {
                id: message.id,
                type: MessageType.Next,
                payload: result,
              });

              const completeMessage: CompleteMessage = {
                id: message.id,
                type: MessageType.Complete,
              };
              await sendMessage<MessageType.Complete>(ctx, completeMessage);
              if (onComplete) {
                onComplete(ctx, completeMessage);
              }
            }
            break;
          }
          case MessageType.Complete: {
            if (ctx.subscriptions[message.id]) {
              await (ctx.subscriptions[message.id].return ?? noop)();
            }
            break;
          }
          default:
            throw new Error(
              `Unexpected message of type ${message.type} received`,
            );
        }
      } catch (err) {
        ctx.socket.close(4400, err.message);
      }
    };
  }

  return {
    webSocketServer,
    dispose: async () => {
      for (const client of webSocketServer.clients) {
        // 1001: Going away
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
