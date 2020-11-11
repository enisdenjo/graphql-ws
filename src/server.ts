/**
 *
 * server
 *
 */

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
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';
import {
  MessageType,
  stringifyMessage,
  parseMessage,
  SubscribeMessage,
  NextMessage,
  ErrorMessage,
  CompleteMessage,
} from './message';
import { isObject, isAsyncIterable, areGraphQLErrors } from './utils';
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
  | undefined
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
   * If you return from `onSubscribe`, and the returned value is
   * missing the `rootValue` field, the relevant operation root
   * will be used instead.
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
   * - Returning a `Record` from the callback will
   * allow the client to connect and pass the returned
   * value to the client through the optional `payload`
   * field in the `ConnectionAck` message.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onConnect?: (
    ctx: Context,
  ) =>
    | Promise<Record<string, unknown> | boolean | void>
    | Record<string, unknown>
    | boolean
    | void;
  /**
   * The subscribe callback executed right after
   * acknowledging the request before any payload
   * processing has been performed.
   *
   * If you return `ExecutionArgs` from the callback,
   * it will be used instead of trying to build one
   * internally. In this case, you are responsible
   * for providing a ready set of arguments which will
   * be directly plugged in the operation execution.
   *
   * Omitting the fields `contextValue` or `rootValue`
   * from the returned value will have the provided server
   * options fill in the gaps.
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
   *
   * Since the library makes sure to complete streaming
   * operations even after an abrupt closure, this callback
   * will still be called.
   */
  onComplete?: (ctx: Context, message: CompleteMessage) => Promise<void> | void;
}

export interface Context {
  /**
   * The actual WebSocket connection between the server and the client.
   */
  readonly socket: WebSocket;
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

export interface Server {
  /**
   * New socket has beeen established offering the provided
   * sub-protocols. The lib will validate the protocols
   * and use the socket accordingly. Returned promise will
   * resolve after the socket closes.
   */
  opened(socket: WebSocket): Promise<void>;
}

export interface WebSocket {
  /**
   * The subprotocol of the WS. Will be used
   * to validate agains the supported ones.
   */
  readonly protocol: string;
  /**
   * Sends a message through the socket. Will always
   * provide a `string` message.
   *
   * The returned promise is used to control the flow of data
   * (like handling backpressure).
   */
  send(data: string): Promise<void> | void;
  /**
   * Closes the socket gracefully. Will always provide
   * the appropriate code and the close reason.
   *
   * The returned promise is used to control the graceful
   * closure.
   */
  close(code: number, reason: string): Promise<void> | void;
  /**
   * Called when message is received. The library requires the data
   * to be a `string`. Callback's promise will resolve once the message
   * handling has completed.
   */
  onMessage(cb: (data: string) => Promise<void>): void;
  /**
   * Waits for the socket to close, by whatever reason.
   * If the socket was already closed, the promise should
   * resolve immediately.
   */
  waitForClose(): Promise<void>;
}

/**
 * Makes a protocol complient WebSocket GraphQL server. The server
 * is actually an API which is to be used with your favourite WebSocket
 * server library!
 *
 * Read more about the protocol in the PROTOCOL.md documentation file.
 */
export function makeServer(options: ServerOptions): Server {
  const {
    schema,
    context,
    roots,
    execute,
    subscribe,
    connectionInitWaitTimeout = 3 * 1000, // 3 seconds
    onConnect,
    onSubscribe,
    onOperation,
    onNext,
    onError,
    onComplete,
  } = options;
  const isProd = process.env.NODE_ENV === 'production';

  return {
    async opened(socket) {
      if (socket.protocol !== GRAPHQL_TRANSPORT_WS_PROTOCOL) {
        return socket.close(1002, 'Protocol Error');
      }

      const ctx: Context = {
        socket,
        connectionInitReceived: false,
        acknowledged: false,
        subscriptions: {},
      };

      // kick the client off (close socket) if the connection has
      // not been initialised after the specified wait timeout
      const connectionInitWait =
        connectionInitWaitTimeout > 0 && isFinite(connectionInitWaitTimeout)
          ? setTimeout(() => {
              if (!ctx.connectionInitReceived) {
                socket.close(4408, 'Connection initialisation timeout');
              }
            }, connectionInitWaitTimeout)
          : null;

      socket.onMessage(async function onMessage(data) {
        try {
          const message = parseMessage(data);
          switch (message.type) {
            case MessageType.ConnectionInit: {
              if (ctx.connectionInitReceived) {
                return ctx.socket.close(
                  4429,
                  'Too many initialisation requests',
                );
              }
              ctx.connectionInitReceived = true;

              if (isObject(message.payload)) {
                ctx.connectionParams = message.payload;
              }

              const permittedOrPayload = await onConnect?.(ctx);
              if (permittedOrPayload === false) {
                return ctx.socket.close(4403, 'Forbidden');
              }

              await socket.send(
                stringifyMessage<MessageType.ConnectionAck>(
                  isObject(permittedOrPayload)
                    ? {
                        type: MessageType.ConnectionAck,
                        payload: permittedOrPayload,
                      }
                    : {
                        type: MessageType.ConnectionAck,
                        // payload is completely absent if not provided
                      },
                ),
              );

              ctx.acknowledged = true;
              break;
            }
            case MessageType.Subscribe: {
              if (!ctx.acknowledged) {
                return socket.close(4401, 'Unauthorized');
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
                  await socket.send(
                    stringifyMessage<MessageType.Next>(nextMessage),
                  );
                },
                error: async (errors: readonly GraphQLError[]) => {
                  let errorMessage: ErrorMessage = {
                    id: message.id,
                    type: MessageType.Error,
                    payload: errors,
                  };
                  if (onError) {
                    const maybeErrors = await onError(
                      ctx,
                      errorMessage,
                      errors,
                    );
                    if (maybeErrors) {
                      errorMessage = {
                        ...errorMessage,
                        payload: maybeErrors,
                      };
                    }
                  }
                  await socket.send(
                    stringifyMessage<MessageType.Error>(errorMessage),
                  );
                },
                complete: async () => {
                  const completeMessage: CompleteMessage = {
                    id: message.id,
                    type: MessageType.Complete,
                  };
                  await onComplete?.(ctx, completeMessage);
                  await socket.send(
                    stringifyMessage<MessageType.Complete>(completeMessage),
                  );
                },
              };

              let execArgs: ExecutionArgs;
              const maybeExecArgsOrErrors = await onSubscribe?.(ctx, message);
              if (maybeExecArgsOrErrors) {
                if (areGraphQLErrors(maybeExecArgsOrErrors)) {
                  return await emit.error(maybeExecArgsOrErrors);
                } else if (Array.isArray(maybeExecArgsOrErrors)) {
                  throw new Error(
                    'Invalid return value from onSubscribe hook, expected an array of GraphQLError objects',
                  );
                }
                // not errors, is exec args
                execArgs = maybeExecArgsOrErrors;
              } else {
                if (!schema) {
                  // you either provide a schema dynamically through
                  // `onSubscribe` or you set one up during the server setup
                  // how to handle?
                  throw new Error('The GraphQL schema is not provided');
                }

                const { operationName, query, variables } = message.payload;
                execArgs = {
                  schema,
                  operationName,
                  document: parse(query),
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

              // if `onSubscribe` didnt specify a rootValue, inject one
              if (!('rootValue' in execArgs)) {
                execArgs.rootValue = roots?.[operationAST.operation];
              }

              // if `onSubscribe` didn't specify a context, inject one
              if (!('contextValue' in execArgs)) {
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
          // TODO-db-201112 hmm, maybe not catch some thrown errors?
          // TODO-db-201031 we perceive this as a client bad request error, but is it always?
          ctx.socket.close(4400, isProd ? 'Bad Request' : err.message);
        }
      });

      // wait for close and cleanup
      await socket.waitForClose();
      if (connectionInitWait) clearTimeout(connectionInitWait);
      for (const sub of Object.values(ctx.subscriptions)) {
        sub.return?.();
      }
    },
  };
}

// handle internal server errors however you want
// if (isErrorEvent(errorOrClose)) {
//   socket.close(
//     1011,
//     isProd ? 'Internal Error' : errorOrClose.message,
//   );
// }

// is OPEN check necessary for safe message sends?
// // Sends through a message only if the socket is open.
// async function sendMessage<T extends MessageType>(
//   ctx: Context,
//   message: Message<T>,
// ) {
//   if (ctx.socket.readyState === WebSocket.OPEN) {
//     return new Promise((resolve, reject) => {
//       ctx.socket.send(stringifyMessage<T>(message), (err) =>
//         err ? reject(err) : resolve(),
//       );
//     });
//   }
// }
