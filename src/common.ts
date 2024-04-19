/**
 *
 * common
 *
 */

import { GraphQLError } from 'graphql';
import { areGraphQLErrors, extendedTypeof, isObject } from './utils';

/**
 * The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](https://github.com/graphql/graphql-over-http/blob/main/rfcs/GraphQLOverWebSocket.md).
 *
 * @category Common
 */
export const GRAPHQL_TRANSPORT_WS_PROTOCOL = 'graphql-transport-ws';

/**
 * The deprecated subprotocol used by [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws).
 *
 * @private
 */
export const DEPRECATED_GRAPHQL_WS_PROTOCOL = 'graphql-ws';

/**
 * `graphql-ws` expected and standard close codes of the [GraphQL over WebSocket Protocol](https://github.com/graphql/graphql-over-http/blob/main/rfcs/GraphQLOverWebSocket.md).
 *
 * @category Common
 */
export enum CloseCode {
  InternalServerError = 4500,
  InternalClientError = 4005,
  BadRequest = 4400,
  BadResponse = 4004,
  /** Tried subscribing before connect ack */
  Unauthorized = 4401,
  Forbidden = 4403,
  SubprotocolNotAcceptable = 4406,
  ConnectionInitialisationTimeout = 4408,
  ConnectionAcknowledgementTimeout = 4504,
  /** Subscriber distinction is very important */
  SubscriberAlreadyExists = 4409,
  TooManyInitialisationRequests = 4429,
}

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
export interface ExecutionResult<
  Data = Record<string, unknown>,
  Extensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: Data | null;
  hasNext?: boolean;
  extensions?: Extensions;
}

/** @category Common */
export interface ExecutionPatchResult<
  Data = unknown,
  Extensions = Record<string, unknown>,
> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: Data | null;
  path?: ReadonlyArray<string | number>;
  label?: string;
  hasNext: boolean;
  extensions?: Extensions;
}

/** @category Common */
export interface NextMessage {
  readonly id: ID;
  readonly type: MessageType.Next;
  readonly payload: ExecutionResult | ExecutionPatchResult;
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
 * Validates the message against the GraphQL over WebSocket Protocol.
 *
 * Invalid messages will throw descriptive errors.
 *
 * @category Common
 */
export function validateMessage(val: unknown): Message {
  if (!isObject(val)) {
    throw new Error(
      `Message is expected to be an object, but got ${extendedTypeof(val)}`,
    );
  }

  if (!val.type) {
    throw new Error(`Message is missing the 'type' property`);
  }
  if (typeof val.type !== 'string') {
    throw new Error(
      `Message is expects the 'type' property to be a string, but got ${extendedTypeof(
        val.type,
      )}`,
    );
  }

  switch (val.type) {
    case MessageType.ConnectionInit:
    case MessageType.ConnectionAck:
    case MessageType.Ping:
    case MessageType.Pong: {
      if (val.payload != null && !isObject(val.payload)) {
        throw new Error(
          `"${val.type}" message expects the 'payload' property to be an object or nullish or missing, but got "${val.payload}"`,
        );
      }

      break;
    }

    case MessageType.Subscribe: {
      if (typeof val.id !== 'string') {
        throw new Error(
          `"${
            val.type
          }" message expects the 'id' property to be a string, but got ${extendedTypeof(
            val.id,
          )}`,
        );
      }
      if (!val.id) {
        throw new Error(
          `"${val.type}" message requires a non-empty 'id' property`,
        );
      }

      if (!isObject(val.payload)) {
        throw new Error(
          `"${
            val.type
          }" message expects the 'payload' property to be an object, but got ${extendedTypeof(
            val.payload,
          )}`,
        );
      }

      if (typeof val.payload.query !== 'string') {
        throw new Error(
          `"${
            val.type
          }" message payload expects the 'query' property to be a string, but got ${extendedTypeof(
            val.payload.query,
          )}`,
        );
      }

      if (val.payload.variables != null && !isObject(val.payload.variables)) {
        throw new Error(
          `"${
            val.type
          }" message payload expects the 'variables' property to be a an object or nullish or missing, but got ${extendedTypeof(
            val.payload.variables,
          )}`,
        );
      }

      if (
        val.payload.operationName != null &&
        extendedTypeof(val.payload.operationName) !== 'string'
      ) {
        throw new Error(
          `"${
            val.type
          }" message payload expects the 'operationName' property to be a string or nullish or missing, but got ${extendedTypeof(
            val.payload.operationName,
          )}`,
        );
      }

      if (val.payload.extensions != null && !isObject(val.payload.extensions)) {
        throw new Error(
          `"${
            val.type
          }" message payload expects the 'extensions' property to be a an object or nullish or missing, but got ${extendedTypeof(
            val.payload.extensions,
          )}`,
        );
      }

      break;
    }

    case MessageType.Next: {
      if (typeof val.id !== 'string') {
        throw new Error(
          `"${
            val.type
          }" message expects the 'id' property to be a string, but got ${extendedTypeof(
            val.id,
          )}`,
        );
      }
      if (!val.id) {
        throw new Error(
          `"${val.type}" message requires a non-empty 'id' property`,
        );
      }

      if (!isObject(val.payload)) {
        throw new Error(
          `"${
            val.type
          }" message expects the 'payload' property to be an object, but got ${extendedTypeof(
            val.payload,
          )}`,
        );
      }

      break;
    }

    case MessageType.Error: {
      if (typeof val.id !== 'string') {
        throw new Error(
          `"${
            val.type
          }" message expects the 'id' property to be a string, but got ${extendedTypeof(
            val.id,
          )}`,
        );
      }
      if (!val.id) {
        throw new Error(
          `"${val.type}" message requires a non-empty 'id' property`,
        );
      }

      if (!areGraphQLErrors(val.payload)) {
        throw new Error(
          `"${
            val.type
          }" message expects the 'payload' property to be an array of GraphQL errors, but got ${JSON.stringify(
            val.payload,
          )}`,
        );
      }

      break;
    }

    case MessageType.Complete: {
      if (typeof val.id !== 'string') {
        throw new Error(
          `"${
            val.type
          }" message expects the 'id' property to be a string, but got ${extendedTypeof(
            val.id,
          )}`,
        );
      }
      if (!val.id) {
        throw new Error(
          `"${val.type}" message requires a non-empty 'id' property`,
        );
      }

      break;
    }

    default:
      throw new Error(`Invalid message 'type' property "${val.type}"`);
  }

  return val as unknown as Message;
}

/**
 * Checks if the provided value is a valid GraphQL over WebSocket message.
 *
 * @deprecated Use `validateMessage` instead.
 *
 * @category Common
 */
export function isMessage(val: unknown): val is Message {
  try {
    validateMessage(val);
    return true;
  } catch {
    return false;
  }
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
export type JSONMessageReviver = (this: any, key: string, value: any) => any;

/**
 * Parses the raw websocket message data to a valid message.
 *
 * @category Common
 */
export function parseMessage(
  data: unknown,
  reviver?: JSONMessageReviver,
): Message {
  return validateMessage(
    typeof data === 'string' ? JSON.parse(data, reviver) : data,
  );
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
export type JSONMessageReplacer = (this: any, key: string, value: any) => any;

/**
 * Stringifies a valid message ready to be sent through the socket.
 *
 * @category Common
 */
export function stringifyMessage<T extends MessageType>(
  msg: Message<T>,
  replacer?: JSONMessageReplacer,
): string {
  validateMessage(msg);
  return JSON.stringify(msg, replacer);
}
