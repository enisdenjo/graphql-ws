/**
 *
 * message
 *
 */

import { GraphQLError, ExecutionResult } from 'graphql';
import {
  isObject,
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
  type: MessageType.ConnectionInit;
  payload?: Record<string, unknown>; // connectionParams
}

export interface ConnectionAckMessage {
  type: MessageType.ConnectionAck;
}

export interface SubscribeMessage {
  id: string;
  type: MessageType.Subscribe;
  payload: {
    operationName: string;
    query: string;
    variables: Record<string, unknown>;
  };
}

export interface NextMessage {
  id: string;
  type: MessageType.Next;
  payload: ExecutionResult;
}

export interface ErrorMessage {
  id: string;
  type: MessageType.Error;
  payload: GraphQLError;
}

export interface CompleteMessage {
  id: string;
  type: MessageType.Complete;
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

export function isMessage(val: unknown): val is Message {
  if (isObject(val)) {
    // all messages must have the `type` prop
    if (!hasOwnProperty(val, 'type')) {
      return false;
    }
    // validate other properties depending on the `type`
    switch (val.type) {
      case MessageType.ConnectionInit:
        // the connection init message can have optional object `connectionParams` in the payload
        return !hasOwnProperty(val, 'payload') || isObject(val.payload);
      case MessageType.ConnectionAck:
        return true;
      case MessageType.Subscribe:
        return (
          hasOwnStringProperty(val, 'id') &&
          hasOwnObjectProperty(val, 'payload') &&
          hasOwnStringProperty(val.payload, 'operationName') &&
          hasOwnStringProperty(val.payload, 'query') &&
          hasOwnObjectProperty(val.payload, 'variables')
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
        return (
          hasOwnStringProperty(val, 'id') &&
          hasOwnObjectProperty(val, 'payload') &&
          // GraphQLError
          hasOwnStringProperty(val.payload, 'message')
        );
      case MessageType.Complete:
        return hasOwnStringProperty(val, 'id');
      default:
        return false;
    }
  }
  return false;
}

export function parseMessage(data: unknown): Message {
  if (isMessage(data)) {
    return data;
  }
  if (typeof data === 'string') {
    const message = JSON.parse(data);
    if (!isMessage(message)) {
      throw new Error('Invalid message');
    }
    return message;
  }
  throw new Error('Message not parsable');
}

/** Helps stringifying a valid message ready to be sent through the socket. */
export function stringifyMessage<T extends MessageType>(
  msg: Message<T>,
): string {
  if (!isMessage(msg)) {
    throw new Error('Cannot stringify invalid message');
  }
  return JSON.stringify(msg);
}
