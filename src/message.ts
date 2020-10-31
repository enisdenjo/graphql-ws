/**
 *
 * message
 *
 */

import { GraphQLError, ExecutionResult, DocumentNode } from 'graphql';
import {
  isObject,
  areGraphQLErrors,
  hasOwnProperty,
  hasOwnObjectProperty,
  hasOwnStringProperty,
} from './utils';

/** Types of messages allowed to be sent by the client/server over the WS protocol. */
export enum MessageType {
  ConnectionInit = 'connection_init', // Client -> Server
  ConnectionAck = 'connection_ack', // Server -> Client

  Subscribe = 'subscribe', // Client -> Server
  Next = 'next', // Server -> Client
  Error = 'error', // Server -> Client
  Complete = 'complete', // bidirectional
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
  readonly operationName?: string | null;
  readonly query: string | DocumentNode;
  readonly variables?: Record<string, unknown> | null;
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

export type Message<
  T extends MessageType = MessageType
> = T extends MessageType.ConnectionAck
  ? ConnectionAckMessage
  : T extends MessageType.ConnectionInit
  ? ConnectionInitMessage
  : T extends MessageType.Subscribe
  ? SubscribeMessage
  : T extends MessageType.Next
  ? NextMessage
  : T extends MessageType.Error
  ? ErrorMessage
  : T extends MessageType.Complete
  ? CompleteMessage
  : never;

/** Checks if the provided value is a message. */
export function isMessage(val: unknown): val is Message {
  if (isObject(val)) {
    // all messages must have the `type` prop
    if (!hasOwnStringProperty(val, 'type')) {
      return false;
    }
    // validate other properties depending on the `type`
    switch (val.type) {
      case MessageType.ConnectionInit:
        // the connection init message can have optional payload object
        return (
          !hasOwnProperty(val, 'payload') ||
          val.payload === undefined ||
          isObject(val.payload)
        );
      case MessageType.ConnectionAck:
        return true;
      case MessageType.Subscribe:
        return (
          hasOwnStringProperty(val, 'id') &&
          hasOwnObjectProperty(val, 'payload') &&
          (!hasOwnProperty(val.payload, 'operationName') ||
            val.payload.operationName === undefined ||
            val.payload.operationName === null ||
            typeof val.payload.operationName === 'string') &&
          (hasOwnStringProperty(val.payload, 'query') || // string query or persisted query id
            hasOwnObjectProperty(val.payload, 'query')) && // document node query
          (!hasOwnProperty(val.payload, 'variables') ||
            val.payload.variables === undefined ||
            val.payload.variables === null ||
            hasOwnObjectProperty(val.payload, 'variables'))
        );
      case MessageType.Next:
        return (
          hasOwnStringProperty(val, 'id') &&
          hasOwnObjectProperty(val, 'payload') &&
          // ExecutionResult
          (hasOwnObjectProperty(val.payload, 'data') ||
            hasOwnObjectProperty(val.payload, 'errors'))
        );
      case MessageType.Error:
        return hasOwnStringProperty(val, 'id') && areGraphQLErrors(val.payload);
      case MessageType.Complete:
        return hasOwnStringProperty(val, 'id');
      default:
        return false;
    }
  }
  return false;
}

/** Parses the raw websocket message data to a valid message. */
export function parseMessage(data: unknown): Message {
  if (isMessage(data)) {
    return data;
  }
  if (typeof data !== 'string') {
    throw new Error('Message not parsable');
  }
  const message = JSON.parse(data);
  if (!isMessage(message)) {
    throw new Error('Invalid message');
  }
  return message;
}

/** Stringifies a valid message ready to be sent through the socket. */
export function stringifyMessage<T extends MessageType>(
  msg: Message<T>,
): string {
  if (!isMessage(msg)) {
    throw new Error('Cannot stringify invalid message');
  }
  return JSON.stringify(msg);
}
