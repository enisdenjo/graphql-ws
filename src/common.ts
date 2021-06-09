/**
 *
 * common
 *
 */

import { GraphQLError, ExecutionResult } from 'graphql';
import {
  isObject,
  areGraphQLErrors,
  hasOwnProperty,
  hasOwnObjectProperty,
  hasOwnStringProperty,
} from './utils';

/**
 * The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).
 *
 * @category Common
 */
export const GRAPHQL_TRANSPORT_WS_PROTOCOL = 'graphql-transport-ws';

/**
 * ID is a string type alias representing
 * the globally unique ID used for identifying
 * subscriptions established by the client.
 *
 * @category Common
 */
export type ID = string;

/** @category Common */
export interface Disposable {
  /** Dispose of the instance and clear up resources. */
  dispose: () => void | Promise<void>;
}

/**
 * A representation of any set of values over any amount of time.
 *
 * @category Common
 */
export interface Sink<T = unknown> {
  /** Next value arriving. */
  next(value: T): void;
  /**
   * An error that has occured. Calling this function "closes" the sink.
   * Besides the errors being `Error` and `readonly GraphQLError[]`, it
   * can also be a `CloseEvent`, but to avoid bundling DOM typings because
   * the client can run in Node env too, you should assert the close event
   * type during implementation.
   */
  error(error: unknown): void;
  /** The sink has completed. This function "closes" the sink. */
  complete(): void;
}

/**
 * Types of messages allowed to be sent by the client/server over the WS protocol.
 *
 * @category Common
 */
export enum MessageType {
  ConnectionInit = 'connection_init', // Client -> Server
  ConnectionAck = 'connection_ack', // Server -> Client

  Ping = 'ping', // bidirectional
  Pong = 'pong', /// bidirectional

  Subscribe = 'subscribe', // Client -> Server
  Next = 'next', // Server -> Client
  Error = 'error', // Server -> Client
  Complete = 'complete', // bidirectional
}

/** @category Common */
export interface ConnectionInitMessage {
  readonly type: MessageType.ConnectionInit;
  readonly payload?: Record<string, unknown>;
}

/** @category Common */
export interface ConnectionAckMessage {
  readonly type: MessageType.ConnectionAck;
  readonly payload?: Record<string, unknown>;
}

/** @category Common */
export interface PingMessage {
  readonly type: MessageType.Ping;
  readonly payload?: Record<string, unknown>;
}

/** @category Common */
export interface PongMessage {
  readonly type: MessageType.Pong;
  readonly payload?: Record<string, unknown>;
}

/** @category Common */
export interface SubscribeMessage {
  readonly id: ID;
  readonly type: MessageType.Subscribe;
  readonly payload: SubscribePayload;
}

/** @category Common */
export interface SubscribePayload {
  readonly operationName?: string | null;
  readonly query: string;
  readonly variables?: Record<string, unknown> | null;
  readonly extensions?: Record<string, unknown> | null;
}

/** @category Common */
export interface NextMessage {
  readonly id: ID;
  readonly type: MessageType.Next;
  readonly payload: ExecutionResult;
}

/** @category Common */
export interface ErrorMessage {
  readonly id: ID;
  readonly type: MessageType.Error;
  readonly payload: readonly GraphQLError[];
}

/** @category Common */
export interface CompleteMessage {
  readonly id: ID;
  readonly type: MessageType.Complete;
}

/** @category Common */
export type Message<T extends MessageType = MessageType> =
  T extends MessageType.ConnectionAck
    ? ConnectionAckMessage
    : T extends MessageType.ConnectionInit
    ? ConnectionInitMessage
    : T extends MessageType.Ping
    ? PingMessage
    : T extends MessageType.Pong
    ? PongMessage
    : T extends MessageType.Subscribe
    ? SubscribeMessage
    : T extends MessageType.Next
    ? NextMessage
    : T extends MessageType.Error
    ? ErrorMessage
    : T extends MessageType.Complete
    ? CompleteMessage
    : never;

/**
 * Checks if the provided value is a message.
 *
 * @category Common
 */
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
      case MessageType.Ping:
      case MessageType.Pong:
        // the connection ack, ping and pong messages can have optional payload object too
        return (
          !hasOwnProperty(val, 'payload') ||
          val.payload === undefined ||
          isObject(val.payload)
        );
      case MessageType.Subscribe:
        return (
          hasOwnStringProperty(val, 'id') &&
          hasOwnObjectProperty(val, 'payload') &&
          (!hasOwnProperty(val.payload, 'operationName') ||
            val.payload.operationName === undefined ||
            val.payload.operationName === null ||
            typeof val.payload.operationName === 'string') &&
          hasOwnStringProperty(val.payload, 'query') &&
          (!hasOwnProperty(val.payload, 'variables') ||
            val.payload.variables === undefined ||
            val.payload.variables === null ||
            hasOwnObjectProperty(val.payload, 'variables')) &&
          (!hasOwnProperty(val.payload, 'extensions') ||
            val.payload.extensions === undefined ||
            val.payload.extensions === null ||
            hasOwnObjectProperty(val.payload, 'extensions'))
        );
      case MessageType.Next:
        return (
          hasOwnStringProperty(val, 'id') &&
          hasOwnObjectProperty(val, 'payload')
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

/**
 * Function for transforming values within a message during JSON parsing
 * The values are produced by parsing the incoming raw JSON.
 *
 * Read more about using it:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#using_the_reviver_parameter
 *
 * @category Common
 */
export type JSONMessageReviver = (this: any, key: string, value: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Parses the raw websocket message data to a valid message.
 *
 * @category Common
 */
export function parseMessage(
  data: unknown,
  reviver?: JSONMessageReviver,
): Message {
  if (isMessage(data)) {
    return data;
  }
  if (typeof data !== 'string') {
    throw new Error('Message not parsable');
  }
  const message = JSON.parse(data, reviver);
  if (!isMessage(message)) {
    throw new Error('Invalid message');
  }
  return message;
}

/**
 * Function that allows customization of the produced JSON string
 * for the elements of an outgoing `Message` object.
 *
 * Read more about using it:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter
 *
 * @category Common
 */
export type JSONMessageReplacer = (this: any, key: string, value: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Stringifies a valid message ready to be sent through the socket.
 *
 * @category Common
 */
export function stringifyMessage<T extends MessageType>(
  msg: Message<T>,
  replacer?: JSONMessageReplacer,
): string {
  if (!isMessage(msg)) {
    throw new Error('Cannot stringify invalid message');
  }
  return JSON.stringify(msg, replacer);
}
