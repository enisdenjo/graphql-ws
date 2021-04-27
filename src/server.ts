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
  validate as graphqlValidate,
  execute as graphqlExecute,
  subscribe as graphqlSubscribe,
  getOperationAST,
  GraphQLError,
  SubscriptionArgs,
  ExecutionResult,
  DocumentNode,
  ValidationRule,
  TypeInfo,
} from 'graphql';
import {
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  ID,
  Message,
  MessageType,
  stringifyMessage,
  parseMessage,
  SubscribeMessage,
  NextMessage,
  ErrorMessage,
  CompleteMessage,
} from './common';
import { isObject, isAsyncIterable, areGraphQLErrors } from './utils';

/** @category Server */
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
 *
 * @category Server
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

/** @category Server */
export interface ServerOptions<E = unknown> {
  /**
   * The GraphQL schema on which the operations
   * will be executed and validated against.
   *
   * If a function is provided, it will be called on
   * every subscription request allowing you to manipulate
   * schema dynamically.
   *
   * If the schema is left undefined, you're trusted to
   * provide one in the returned `ExecutionArgs` from the
   * `onSubscribe` callback.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  schema?:
    | GraphQLSchema
    | ((
        ctx: Context<E>,
        message: SubscribeMessage,
        args: Omit<ExecutionArgs, 'schema'>,
      ) => Promise<GraphQLSchema> | GraphQLSchema);
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
        ctx: Context<E>,
        message: SubscribeMessage,
        args: ExecutionArgs,
      ) =>
        | Promise<GraphQLExecutionContextValue>
        | GraphQLExecutionContextValue);
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
   * A custom GraphQL validate function allowing you to apply your
   * own validation rules.
   *
   * Returned, non-empty, array of `GraphQLError`s will be communicated
   * to the client through the `ErrorMessage`. Use an empty array if the
   * document is valid and no errors have been encountered.
   *
   * Will not be used when implementing a custom `onSubscribe`.
   *
   * Throwing an error from within this function will close the socket
   * with the `Error` message in the close event reason.
   */
  validate?: (
    schema: GraphQLSchema,
    documentAST: DocumentNode,
    rules?: ReadonlyArray<ValidationRule>,
    typeInfo?: TypeInfo,
    options?: { maxErrors?: number },
  ) => ReadonlyArray<GraphQLError>;
  /**
   * Is the `execute` function from GraphQL which is
   * used to execute the query and mutation operations.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  execute?: (args: ExecutionArgs) => OperationResult;
  /**
   * Is the `subscribe` function from GraphQL which is
   * used to execute the subscription operation.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  subscribe?: (args: ExecutionArgs) => OperationResult;
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
    ctx: Context<E>,
  ) =>
    | Promise<Record<string, unknown> | boolean | void>
    | Record<string, unknown>
    | boolean
    | void;
  /**
   * Called when the client disconnects for whatever reason after
   * he successfully went through the connection initialisation phase.
   * Provides the close event too. Beware that this callback happens
   * AFTER all subscriptions have been gracefully completed and BEFORE
   * the `onClose` callback.
   *
   * If you are interested in tracking the subscriptions completions,
   * consider using the `onComplete` callback.
   *
   * This callback will be called EXCLUSIVELY if the client connection
   * is acknowledged. Meaning, `onConnect` will be called before the `onDisconnect`.
   *
   * For tracking socket closures at any point in time, regardless
   * of the connection state - consider using the `onClose` callback.
   */
  onDisconnect?: (
    ctx: Context<E>,
    code: number,
    reason: string,
  ) => Promise<void> | void;
  /**
   * Called when the socket closes for whatever reason, at any
   * point in time. Provides the close event too. Beware
   * that this callback happens AFTER all subscriptions have
   * been gracefully completed and AFTER the `onDisconnect` callback.
   *
   * If you are interested in tracking the subscriptions completions,
   * consider using the `onComplete` callback.
   *
   * In comparison to `onDisconnect`, this callback will ALWAYS
   * be called, regardless if the user succesfully went through
   * the connection initialisation or not. `onConnect` might not
   * called before the `onClose`.
   */
  onClose?: (
    ctx: Context<E>,
    code: number,
    reason: string,
  ) => Promise<void> | void;
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
    ctx: Context<E>,
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
    ctx: Context<E>,
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
    ctx: Context<E>,
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
    ctx: Context<E>,
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
  onComplete?: (
    ctx: Context<E>,
    message: CompleteMessage,
  ) => Promise<void> | void;
}

/** @category Server */
export interface Server<E = undefined> {
  /**
   * New socket has beeen established. The lib will validate
   * the protocol and use the socket accordingly. Returned promise
   * will resolve after the socket closes.
   *
   * The second argument will be passed in the `extra` field
   * of the `Context`. You may pass the initial request or the
   * original WebSocket, if you need it down the road.
   *
   * Returns a function that should be called when the same socket
   * has been closed, for whatever reason. The close code and reason
   * must be passed for reporting to the `onDisconnect` callback. Returned
   * promise will resolve once the internal cleanup is complete.
   */
  opened(
    socket: WebSocket,
    ctxExtra: E,
  ): (code: number, reason: string) => Promise<void>; // closed
}

/** @category Server */
export interface WebSocket {
  /**
   * The subprotocol of the WebSocket. Will be used
   * to validate agains the supported ones.
   */
  readonly protocol: string;
  /**
   * Sends a message through the socket. Will always
   * provide a `string` message.
   *
   * Please take care that the send is ready. Meaning,
   * only provide a truly OPEN socket through the `opened`
   * method of the `Server`.
   *
   * The returned promise is used to control the flow of data
   * (like handling backpressure).
   */
  send(data: string): Promise<void> | void;
  /**
   * Closes the socket gracefully. Will always provide
   * the appropriate code and close reason. `onDisconnect`
   * callback will be called.
   *
   * The returned promise is used to control the graceful
   * closure.
   */
  close(code: number, reason: string): Promise<void> | void;
  /**
   * Called when message is received. The library requires the data
   * to be a `string`.
   *
   * All operations requested from the client will block the promise until
   * completed, this means that the callback will not resolve until all
   * subscription events have been emitted (or until the client has completed
   * the stream), or until the query/mutation resolves.
   *
   * Exceptions raised during any phase of operation processing will
   * reject the callback's promise, catch them and communicate them
   * to your clients however you wish.
   */
  onMessage(cb: (data: string) => Promise<void>): void;
}

/** @category Server */
export interface Context<E = unknown> {
  /**
   * Indicates that the `ConnectionInit` message
   * has been received by the server. If this is
   * `true`, the client wont be kicked off after
   * the wait timeout has passed.
   */
  readonly connectionInitReceived: boolean;
  /**
   * Indicates that the connection was acknowledged
   * by having dispatched the `ConnectionAck` message
   * to the related client.
   */
  readonly acknowledged: boolean;
  /** The parameters passed during the connection initialisation. */
  readonly connectionParams?: Readonly<Record<string, unknown>>;
  /**
   * Holds the active subscriptions for this context. **All operations**
   * that are taking place are aggregated here. The user is _subscribed_
   * to an operation when waiting for result(s).
   *
   * If the subscription behind an ID is an `AsyncIterator` - the operation
   * is streaming; on the contrary, if the subscription is `null` - it is simply
   * a reservation, meaning - the operation resolves to a single result or is still
   * pending/being prepared.
   */
  readonly subscriptions: Record<ID, AsyncIterator<unknown> | null>;
  /**
   * An extra field where you can store your own context values
   * to pass between callbacks.
   */
  extra: E;
}

/**
 * Makes a Protocol complient WebSocket GraphQL server. The server
 * is actually an API which is to be used with your favourite WebSocket
 * server library!
 *
 * Read more about the Protocol in the PROTOCOL.md documentation file.
 *
 * @category Server
 */
export function makeServer<E = unknown>(options: ServerOptions<E>): Server<E> {
  const {
    schema,
    context,
    roots,
    validate,
    execute,
    subscribe,
    connectionInitWaitTimeout = 3 * 1000, // 3 seconds
    onConnect,
    onDisconnect,
    onClose,
    onSubscribe,
    onOperation,
    onNext,
    onError,
    onComplete,
  } = options;

  return {
    opened(socket, extra) {
      if (socket.protocol !== GRAPHQL_TRANSPORT_WS_PROTOCOL) {
        socket.close(1002, 'Protocol Error');
        return async (code, reason) => {
          /* nothing was set up, just notify the closure */
          await onClose?.(ctx, code, reason);
        };
      }

      const ctx: Context<E> = {
        connectionInitReceived: false,
        acknowledged: false,
        subscriptions: {},
        extra,
      };

      // kick the client off (close socket) if the connection has
      // not been initialised after the specified wait timeout
      const connectionInitWait =
        connectionInitWaitTimeout > 0 && isFinite(connectionInitWaitTimeout)
          ? setTimeout(() => {
              if (!ctx.connectionInitReceived)
                socket.close(4408, 'Connection initialisation timeout');
            }, connectionInitWaitTimeout)
          : null;

      socket.onMessage(async function onMessage(data) {
        let message: Message;
        try {
          message = parseMessage(data);
        } catch (err) {
          return socket.close(4400, 'Invalid message received');
        }
        switch (message.type) {
          case MessageType.ConnectionInit: {
            if (ctx.connectionInitReceived)
              return socket.close(4429, 'Too many initialisation requests');

            // @ts-expect-error: I can write
            ctx.connectionInitReceived = true;

            if (isObject(message.payload))
              // @ts-expect-error: I can write
              ctx.connectionParams = message.payload;

            const permittedOrPayload = await onConnect?.(ctx);
            if (permittedOrPayload === false)
              return socket.close(4403, 'Forbidden');

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

            // @ts-expect-error: I can write
            ctx.acknowledged = true;
            return;
          }
          case MessageType.Subscribe: {
            if (!ctx.acknowledged) return socket.close(4401, 'Unauthorized');

            const { id, payload } = message;
            if (id in ctx.subscriptions)
              return socket.close(4409, `Subscriber for ${id} already exists`);

            // if this turns out to be a streaming operation, the subscription value
            // will change to an `AsyncIterable`, otherwise it will stay as is
            ctx.subscriptions[id] = null;

            const emit = {
              next: async (result: ExecutionResult, args: ExecutionArgs) => {
                let nextMessage: NextMessage = {
                  id,
                  type: MessageType.Next,
                  payload: result,
                };
                const maybeResult = await onNext?.(
                  ctx,
                  nextMessage,
                  args,
                  result,
                );
                if (maybeResult)
                  nextMessage = {
                    ...nextMessage,
                    payload: maybeResult,
                  };
                await socket.send(
                  stringifyMessage<MessageType.Next>(nextMessage),
                );
              },
              error: async (errors: readonly GraphQLError[]) => {
                let errorMessage: ErrorMessage = {
                  id,
                  type: MessageType.Error,
                  payload: errors,
                };
                const maybeErrors = await onError?.(ctx, errorMessage, errors);
                if (maybeErrors)
                  errorMessage = {
                    ...errorMessage,
                    payload: maybeErrors,
                  };
                await socket.send(
                  stringifyMessage<MessageType.Error>(errorMessage),
                );
              },
              complete: async (notifyClient: boolean) => {
                const completeMessage: CompleteMessage = {
                  id,
                  type: MessageType.Complete,
                };
                await onComplete?.(ctx, completeMessage);
                if (notifyClient)
                  await socket.send(
                    stringifyMessage<MessageType.Complete>(completeMessage),
                  );
              },
            };

            let execArgs: ExecutionArgs;
            const maybeExecArgsOrErrors = await onSubscribe?.(ctx, message);
            if (maybeExecArgsOrErrors) {
              if (areGraphQLErrors(maybeExecArgsOrErrors))
                return await emit.error(maybeExecArgsOrErrors);
              else if (Array.isArray(maybeExecArgsOrErrors))
                throw new Error(
                  'Invalid return value from onSubscribe hook, expected an array of GraphQLError objects',
                );
              // not errors, is exec args
              execArgs = maybeExecArgsOrErrors;
            } else {
              // you either provide a schema dynamically through
              // `onSubscribe` or you set one up during the server setup
              if (!schema)
                throw new Error('The GraphQL schema is not provided');

              const args = {
                operationName: payload.operationName,
                document: parse(payload.query),
                variableValues: payload.variables,
              };
              execArgs = {
                ...args,
                schema:
                  typeof schema === 'function'
                    ? await schema(ctx, message, args)
                    : schema,
              };
              const validationErrors = (validate ?? graphqlValidate)(
                execArgs.schema,
                execArgs.document,
              );
              if (validationErrors.length > 0)
                return await emit.error(validationErrors);
            }

            const operationAST = getOperationAST(
              execArgs.document,
              execArgs.operationName,
            );
            if (!operationAST)
              return await emit.error([
                new GraphQLError('Unable to identify operation'),
              ]);

            // if `onSubscribe` didnt specify a rootValue, inject one
            if (!('rootValue' in execArgs))
              execArgs.rootValue = roots?.[operationAST.operation];

            // if `onSubscribe` didn't specify a context, inject one
            if (!('contextValue' in execArgs))
              execArgs.contextValue =
                typeof context === 'function'
                  ? await context(ctx, message, execArgs)
                  : context;

            // the execution arguments have been prepared
            // perform the operation and act accordingly
            let operationResult;
            if (operationAST.operation === 'subscription')
              operationResult = await (subscribe ?? graphqlSubscribe)(execArgs);
            // operation === 'query' || 'mutation'
            else operationResult = await (execute ?? graphqlExecute)(execArgs);

            const maybeResult = await onOperation?.(
              ctx,
              message,
              execArgs,
              operationResult,
            );
            if (maybeResult) operationResult = maybeResult;

            if (isAsyncIterable(operationResult)) {
              /** multiple emitted results */
              if (!(id in ctx.subscriptions)) {
                // subscription was completed/canceled before the operation settled
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                operationResult.return!(); // iterator must implement the return method
              } else {
                ctx.subscriptions[id] = operationResult;
                for await (const result of operationResult) {
                  await emit.next(result, execArgs);
                }
              }
            } else {
              /** single emitted result */
              // if the client completed the subscription before the single result
              // became available, he effectively canceled it and no data should be sent
              if (id in ctx.subscriptions)
                await emit.next(operationResult, execArgs);
            }

            // lack of subscription at this point indicates that the client
            // completed the subscription, he doesnt need to be reminded
            await emit.complete(id in ctx.subscriptions);
            delete ctx.subscriptions[id];
            return;
          }
          case MessageType.Complete: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await ctx.subscriptions[message.id]?.return!(); // iterator must implement the return method
            delete ctx.subscriptions[message.id]; // deleting the subscription means no further activity should take place
            return;
          }
          default:
            throw new Error(
              `Unexpected message of type ${message.type} received`,
            );
        }
      });

      // wait for close, cleanup and the disconnect callback
      return async (code, reason) => {
        if (connectionInitWait) clearTimeout(connectionInitWait);
        for (const sub of Object.values(ctx.subscriptions)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          await sub?.return!(); // iterator must implement the return method
        }
        if (ctx.acknowledged) await onDisconnect?.(ctx, code, reason);
        await onClose?.(ctx, code, reason);
      };
    },
  };
}
