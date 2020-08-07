/**
 *
 * message
 *
 */

import { GraphQLError, ExecutionResult } from 'graphql';

/** Types of messages allowed to be sent by the client/server over the WS protocol. */
export enum MessageType {
  ConnectionInit = 'connection_init', // Client -> Server
  ConnectionAck = 'connection_ack', // Server -> Client

  Subscribe = 'subscribe', // Client -> Server
  Next = 'next', // Server -> Client
  Error = 'error', // Server -> Client
  Complete = 'complete', // Client -> Server
}

interface SubscribeOperation {
  operationName: string;
  query: string;
  variables: Record<string, unknown>;
}

export type MessagePayload =
  | SubscribeOperation
  | ExecutionResult
  | GraphQLError;

function isMessagePayload(val: unknown): val is MessagePayload {
  if (typeof val !== 'object' || val == null) {
    return false;
  }
  if (
    // SubscribeOperation
    ('operationName' in val && 'query' in val && 'variables' in val) ||
    // ExecutionResult
    'data' in val ||
    'errors' in val ||
    // GraphQLError
    ('message' in val && Object.keys(val).length === 1)
  ) {
    return true;
  }
  return false;
}

export interface Message {
  /**
   * The message ID. Can be missing in cases when
   * managing the subscription connection itself.
   */
  id?: string;
  type: MessageType;
  payload?: MessagePayload; // missing for connection messages
}

export function isMessage(val: unknown): val is Message {
  // value must be an object
  if (typeof val !== 'object' || val == null) {
    return false;
  }
  // type field must exist
  if (!('type' in val)) {
    return false;
  }
  // if the payload exists, validate it
  if ('payload' in val) {
    return isMessagePayload((val as any).payload);
  }
  // id does not have to exist, so we dont even check it
  return true;
}

export function parseMessage(data: unknown): Message {
  if (isMessage(data)) {
    return data;
  }
  if (typeof data === 'string') {
    const message = JSON.parse(data);
    if (!isMessage(message)) {
      throw new Error('Data is an object but not a valid message');
    }
    return message;
  }
  throw new Error('Data is not a valid parsable message');
}
