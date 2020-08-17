/**
 *
 * message
 *
 */
import { GraphQLError, ExecutionResult, DocumentNode } from 'graphql';
/** Types of messages allowed to be sent by the client/server over the WS protocol. */
export declare enum MessageType {
    ConnectionInit = "connection_init",
    ConnectionAck = "connection_ack",
    Subscribe = "subscribe",
    Next = "next",
    Error = "error",
    Complete = "complete"
}
export interface ConnectionInitMessage {
    readonly type: MessageType.ConnectionInit;
    readonly payload?: Record<string, unknown>;
}
export interface ConnectionAckMessage {
    readonly type: MessageType.ConnectionAck;
}
export interface SubscribeMessage {
    readonly id: string;
    readonly type: MessageType.Subscribe;
    readonly payload: SubscribePayload;
}
export interface SubscribePayload {
    readonly operationName: string;
    readonly query: string | DocumentNode;
    readonly variables: Record<string, unknown>;
}
export interface NextMessage {
    readonly id: string;
    readonly type: MessageType.Next;
    readonly payload: ExecutionResult;
}
export interface ErrorMessage {
    readonly id: string;
    readonly type: MessageType.Error;
    readonly payload: readonly GraphQLError[];
}
export interface CompleteMessage {
    readonly id: string;
    readonly type: MessageType.Complete;
}
export declare type Message<T extends MessageType = MessageType> = T extends MessageType.ConnectionAck ? ConnectionAckMessage : T extends MessageType.ConnectionInit ? ConnectionInitMessage : T extends MessageType.Subscribe ? SubscribeMessage : T extends MessageType.Next ? NextMessage : T extends MessageType.Error ? ErrorMessage : T extends MessageType.Complete ? CompleteMessage : never;
/** @ignore */
export declare function isMessage(val: unknown): val is Message;
/** @ignore */
export declare function parseMessage(data: unknown): Message;
/**
 * @ignore
 * Helps stringifying a valid message ready to be sent through the socket.
 */
export declare function stringifyMessage<T extends MessageType>(msg: Message<T>): string;
