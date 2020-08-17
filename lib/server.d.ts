/**
 *
 * server
 *
 */
import WebSocket from 'ws';
import { GraphQLSchema, ValidationRule, ExecutionResult, ExecutionArgs } from 'graphql';
import { Disposable } from './types';
import { SubscribeMessage, CompleteMessage } from './message';
import { Optional } from './utils';
import { UUID } from './types';
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
    subscribe: (args: ExecutionArgs) => Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>;
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
     * Set the value to `Infinity` to skip waiting.
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
     * result.
     */
    formatExecutionResult?: (ctx: Context, result: ExecutionResult) => Promise<ExecutionResult> | ExecutionResult;
    /**
     * The subscribe callback executed before
     * the actual operation execution. Useful
     * for manipulating the execution arguments
     * before the doing the operation.
     */
    onSubscribe?: (ctx: Context, message: SubscribeMessage, args: Optional<ExecutionArgs, 'schema'>) => Promise<ExecutionArgs> | ExecutionArgs;
    /**
     * The complete callback is executed after the
     * operation has completed or the subscription
     * has been closed.
     */
    onComplete?: (ctx: Context, message: CompleteMessage) => void;
}
export interface Context {
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
     * Subscriptions are for `subscription` operations **only**,
     * other operations (`query`/`mutation`) are resolved immediately.
     */
    subscriptions: Record<UUID, AsyncIterator<unknown>>;
}
export interface Server extends Disposable {
    webSocketServer: WebSocket.Server;
}
declare type WebSocketServerOptions = WebSocket.ServerOptions;
declare type WebSocketServer = WebSocket.Server;
/**
 * Creates a protocol complient WebSocket GraphQL
 * subscription server. Read more about the protocol
 * in the PROTOCOL.md documentation file.
 */
export declare function createServer(options: ServerOptions, websocketOptionsOrServer: WebSocketServerOptions | WebSocketServer): Server;
export {};
