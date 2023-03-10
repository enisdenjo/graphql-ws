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
} from 'graphql';
import { Context, makeBaseServer, Server } from './base-server';
import {
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  ID,
  ConnectionInitMessage,
  SubscribeMessage,
  NextMessage,
  ErrorMessage,
  CompleteMessage,
  JSONMessageReplacer,
  JSONMessageReviver,
  ExecutionResult,
  ExecutionPatchResult,
  MessageType,
} from './common';
import { areGraphQLErrors, isAsyncGenerator, isAsyncIterable } from './utils';

/** @category Server */
export type OperationResult =
  | Promise<
      | AsyncGenerator<ExecutionResult | ExecutionPatchResult>
      | AsyncIterable<ExecutionResult | ExecutionPatchResult>
      | ExecutionResult
    >
  | AsyncGenerator<ExecutionResult | ExecutionPatchResult>
  | AsyncIterable<ExecutionResult | ExecutionPatchResult>
  | ExecutionResult;

export { Context, WebSocket, Server } from './base-server';
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
export interface ServerOptions<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E = unknown,
> {
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
        ctx: Context<P, E>,
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
   *
   * Note that the context function is invoked on each operation only once.
   * Meaning, for subscriptions, only at the point of initialising the subscription;
   * not on every subscription event emission. Read more about the context lifecycle
   * in subscriptions here: https://github.com/graphql/graphql-js/issues/894.
   */
  context?:
    | GraphQLExecutionContextValue
    | ((
        ctx: Context<P, E>,
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
  validate?: typeof graphqlValidate;
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
   * @default 3_000 // 3 seconds
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
    ctx: Context<P, E>,
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
    ctx: Context<P, E>,
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
    ctx: Context<P, E>,
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
    ctx: Context<P, E>,
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
    ctx: Context<P, E>,
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
    ctx: Context<P, E>,
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
    ctx: Context<P, E>,
    message: NextMessage,
    args: ExecutionArgs,
    result: ExecutionResult | ExecutionPatchResult,
  ) =>
    | Promise<ExecutionResult | ExecutionPatchResult | void>
    | ExecutionResult
    | ExecutionPatchResult
    | void;
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
    ctx: Context<P, E>,
    message: CompleteMessage,
  ) => Promise<void> | void;
  /**
   * An optional override for the JSON.parse function used to hydrate
   * incoming messages to this server. Useful for parsing custom datatypes
   * out of the incoming JSON.
   */
  jsonMessageReviver?: JSONMessageReviver;
  /**
   * An optional override for the JSON.stringify function used to serialize
   * outgoing messages to from server. Useful for serializing custom
   * datatypes out to the client.
   */
  jsonMessageReplacer?: JSONMessageReplacer;
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
export function makeServer<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E = unknown,
>(options: ServerOptions<P, E>): Server<E> {
  const {
    schema,
    context,
    roots,
    validate,
    execute,
    subscribe,
    connectionInitWaitTimeout = 3_000, // 3 seconds
    onConnect,
    onDisconnect,
    onClose,
    onSubscribe,
    onOperation,
    onNext,
    onError,
    onComplete,
    jsonMessageReviver,
    jsonMessageReplacer,
  } = options;

  async function toError(
    id: ID,
    ctx: Context<P, E>,
    errors: readonly GraphQLError[],
  ): Promise<ErrorMessage> {
    let errorMessage: ErrorMessage = {
      id: id,
      type: MessageType.Error,
      payload: errors,
    };
    const maybeErrors = await onError?.(ctx, errorMessage, errors);
    if (maybeErrors)
      errorMessage = {
        ...errorMessage,
        payload: maybeErrors,
      };

    return errorMessage;
  }

  const toNext = async (
    id: string,
    ctx: Context<P, E>,
    execArgs: ExecutionArgs,
    res: ExecutionResult | ExecutionPatchResult,
  ) => {
    let msg: NextMessage = { id: id, payload: res, type: MessageType.Next };
    const onNextRes = await onNext?.(ctx, msg, execArgs, res);
    if (onNextRes) {
      msg = {
        ...msg,
        payload: onNextRes,
      };
    }

    return msg;
  };

  async function _execute(props: {
    setGenerator: (gen: AsyncGenerator) => void;
    ctx: Context<P, E>;
    message: SubscribeMessage;
    emit: (message: NextMessage) => void;
    stop: () => void;
    isStopped: () => boolean;
  }) {
    const { ctx, isStopped, message, setGenerator, emit, stop } = props;
    const { id, payload } = message;

    let execArgs: ExecutionArgs;
    const maybeExecArgsOrErrors = await onSubscribe?.(ctx, message);
    if (isStopped()) {
      return stop();
    }

    if (maybeExecArgsOrErrors) {
      if (areGraphQLErrors(maybeExecArgsOrErrors)) {
        return await toError(id, ctx, maybeExecArgsOrErrors);
      } else if (Array.isArray(maybeExecArgsOrErrors))
        throw new Error(
          'Invalid return value from onSubscribe hook, expected an array of GraphQLError objects',
        );

      // not errors, is exec args
      execArgs = maybeExecArgsOrErrors;
    } else {
      // you either provide a schema dynamically through
      // `onSubscribe` or you set one up during the server setup
      if (!schema) {
        throw new Error('The GraphQL schema is not provided');
      }

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

      if (isStopped()) {
        return stop();
      }

      const validationErrors = (validate ?? graphqlValidate)(
        execArgs.schema,
        execArgs.document,
      );

      if (validationErrors.length > 0) {
        return await toError(id, ctx, validationErrors);
      }
    }

    const operationAST = getOperationAST(
      execArgs.document,
      execArgs.operationName,
    );

    if (!operationAST) {
      return await toError(id, ctx, [
        new GraphQLError('Unable to identify operation'),
      ]);
    }

    // if `onSubscribe` didnt specify a rootValue, inject one
    if (!('rootValue' in execArgs))
      execArgs.rootValue = roots?.[operationAST.operation];

    // if `onSubscribe` didn't specify a context, inject one
    if (!('contextValue' in execArgs))
      execArgs.contextValue =
        typeof context === 'function'
          ? await context(ctx, message, execArgs)
          : context;

    if (isStopped()) {
      return stop();
    }

    // this is the place where subscription part is happening
    let operationResult: OperationResult;
    if (operationAST.operation === 'subscription')
      operationResult = await (subscribe ?? graphqlSubscribe)(execArgs);
    // operation === 'query' || 'mutation'
    else operationResult = await (execute ?? graphqlExecute)(execArgs);

    if (isAsyncGenerator(operationResult)) {
      setGenerator(operationResult);
    }

    if (isStopped()) {
      return stop();
    }

    const maybeResult = await onOperation?.(
      ctx,
      message,
      execArgs,
      operationResult,
    );

    if (maybeResult) {
      operationResult = maybeResult;
      if (isAsyncGenerator(operationResult)) {
        setGenerator(operationResult);
      }
    }

    if (isStopped()) {
      return stop();
    }

    if (isAsyncIterable(operationResult)) {
      if (isAsyncGenerator(operationResult)) {
        setGenerator(operationResult);
      }
      // subscribe here
      for await (const r of operationResult) {
        emit(await toNext(message.id, ctx, execArgs, r));
      }
    } else {
      emit(await toNext(message.id, ctx, execArgs, operationResult));
    }
  }

  const baseServer = makeBaseServer<P, E>({
    connectionInitWaitTimeout,
    jsonMessageReplacer,
    jsonMessageReviver,
    onConnect,
    subscribe(props) {
      let generator: AsyncGenerator | null;
      let running = true;
      function isStopped() {
        return !running;
      }

      function stop() {
        running = false;
        if (generator) {
          generator.return(undefined);
        }
      }

      // non blocking
      const waitForComplete = _execute({
        ctx: props.ctx,
        emit: props.emit,
        stop,
        isStopped,
        message: props.message,
        setGenerator(gen) {
          generator = gen;
        },
      });

      return {
        waitToResolve: waitForComplete,
        cancel: stop,
      };
    },
    onClose,
    onComplete,
    onDisconnect,
  });

  return baseServer;
}

/**
 * Helper utility for choosing the "graphql-transport-ws" subprotocol from
 * a set of WebSocket subprotocols.
 *
 * Accepts a set of already extracted WebSocket subprotocols or the raw
 * Sec-WebSocket-Protocol header value. In either case, if the right
 * protocol appears, it will be returned.
 *
 * By specification, the server should not provide a value with Sec-WebSocket-Protocol
 * if it does not agree with client's subprotocols. The client has a responsibility
 * to handle the connection afterwards.
 *
 * @category Server
 */
export function handleProtocols(
  protocols: Set<string> | string[] | string,
): typeof GRAPHQL_TRANSPORT_WS_PROTOCOL | false {
  switch (true) {
    case protocols instanceof Set &&
      protocols.has(GRAPHQL_TRANSPORT_WS_PROTOCOL):
    case Array.isArray(protocols) &&
      protocols.includes(GRAPHQL_TRANSPORT_WS_PROTOCOL):
    case typeof protocols === 'string' &&
      protocols
        .split(',')
        .map((p) => p.trim())
        .includes(GRAPHQL_TRANSPORT_WS_PROTOCOL):
      return GRAPHQL_TRANSPORT_WS_PROTOCOL;
    default:
      return false;
  }
}
