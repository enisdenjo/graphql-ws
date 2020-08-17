/**
 *
 * GraphQL over WebSocket Protocol
 *
 * Check out the `PROTOCOL.md` document for the transport specification.
 *
 */
import { Sink, Disposable } from './types';
import { SubscribePayload } from './message';
/** Configuration used for the `create` client function. */
export interface ClientOptions {
    /** URL of the GraphQL server to connect. */
    url: string;
    /** Optional parameters that the client specifies when establishing a connection with the server. */
    connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
}
export interface Client extends Disposable {
    /**
     * Subscribes through the WebSocket following the config parameters. It
     * uses the `sink` to emit received data or errors. Returns a _cleanup_
     * function used for dropping the subscription and cleaning stuff up.
     */
    subscribe<T = unknown>(payload: SubscribePayload, sink: Sink<T>): () => void;
}
/** Creates a disposable GQL subscriptions client. */
export declare function createClient(options: ClientOptions): Client;
