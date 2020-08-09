/**
 *
 * GraphQL subscriptions over the WebSocket Protocol
 *
 * Check out the `PROTOCOL.md` document for the transport specification.
 *
 */

import WebSocketAsPromised from 'websocket-as-promised';

/**
 * The shape of a GraphQL response as dictated by the
 * [spec](https://graphql.github.io/graphql-spec/June2018/#sec-Response-Format)
 */
export interface GraphQLResponseWithData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  errors?: {
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
  }[];
  path?: string[] | number[];
}
export interface GraphQLResponseWithoutData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  errors: {
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
  }[];
  path?: Array<string | number>;
}
export interface GraphQLError {
  message: string;
}
export type GraphQLResponse =
  | GraphQLResponseWithData
  | GraphQLResponseWithoutData
  | GraphQLError;

/** Used to indicate that the requestId is missing. */
const NO_REQUEST_ID = 'NRID';
function isNoRequestId(val: unknown): val is typeof NO_REQUEST_ID {
  return val === NO_REQUEST_ID;
}

/**
 * Is the raw message being sent through the WebSocket connection.
 * Since the ID generation is done automatically, we have 2 separate
 * types for the two possible messages.
 */
export interface MessageWithoutID {
  type: MessageType;
  payload?: GraphQLResponse | null; // missing for connection messages
}
export interface Message extends MessageWithoutID {
  /**
   * The message ID (internally represented as the `requestId`).
   * Can be missing in cases when managing the subscription
   * connection itself.
   */
  id: string | typeof NO_REQUEST_ID;
}

/** Types of messages allowed to be sent by the client/server over the WS protocol. */
export enum MessageType {
  ConnectionInit = 'connection_init', // Client -> Server
  ConnectionAck = 'connection_ack', // Server -> Client
  ConnectionError = 'connection_error', // Server -> Client

  // NOTE: The keep alive message type does not follow the standard due to connection optimizations
  ConnectionKeepAlive = 'ka', // Server -> Client

  ConnectionTerminate = 'connection_terminate', // Client -> Server
  Start = 'start', // Client -> Server
  Data = 'data', // Server -> Client
  Error = 'error', // Server -> Client
  Complete = 'complete', // Server -> Client
  Stop = 'stop', // Client -> Server
}

/** Checks if the value has a shape of a `Message`. */
function isMessage(val: unknown): val is Message {
  if (typeof val !== 'object' || val == null) {
    return false;
  }
  // TODO-db-200603 validate the type
  if ('type' in val && Boolean((val as Message).type)) {
    return true;
  }
  return false;
}

/** Checks if the value has a shape of a `GraphQLResponse`. */
function isGraphQLResponse(val: unknown): val is GraphQLResponse {
  if (typeof val !== 'object' || val == null) {
    return false;
  }
  if (
    // GraphQLResponseWithData
    'data' in val ||
    // GraphQLResponseWithoutData
    'errors' in val ||
    // GraphQLError
    ('message' in val && Object.keys(val).length === 1)
  ) {
    return true;
  }
  return false;
}

/** The payload used for starting GraphQL subscriptions. */
export interface StartPayload {
  // GraphQL operation name.
  operationName?: string;
  // GraphQL operation as string or parsed GraphQL document node.
  query: string;
  // Object with GraphQL variables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: Record<string, any>;
}

/** The sink to communicate the subscription through. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Sink<T = any> {
  next(value: T): void;
  error(error: Error): void;
  complete(): void;
  readonly closed: boolean;
}

/** Configuration used for the `create` client function. */
export interface Config {
  // URL of the GraphQL server to connect.
  url: string;
  // Optional parameters that the client specifies when establishing a connection with the server.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionParams?: Record<string, any> | (() => Record<string, any>);
}

export interface Client {
  /**
   * Subscribes through the WebSocket following the config parameters. It
   * uses the `sink` to emit received data or errors. Returns a _cleanup_
   * function used for dropping the subscription and cleaning stuff up.
   */
  subscribe<T>(payload: StartPayload, sink: Sink<T>): () => void;
  /** Disposes of all active subscriptions, closes the WebSocket client and frees up memory. */
  dispose(): Promise<void>;
}

/** Creates a disposable GQL subscriptions client. */
export function createClient({ url, connectionParams }: Config): Client {
  const ws = new WebSocketAsPromised(url, {
    timeout: 2 * 1000, // timeout for opening connections and sending requests -> 2 seconds
    createWebSocket: (url) => new WebSocket(url, 'graphql-ws'),
    packMessage: (data) => JSON.stringify(data),
    unpackMessage: (data) => {
      if (typeof data !== 'string') {
        throw new Error(`Unsupported message data type ${typeof data}`);
      }
      return JSON.parse(data);
    },
    // omits when receiving a no request id symbol to avoid confusion and reduce message size
    attachRequestId: (data, requestId): Message => {
      if (isNoRequestId(requestId)) {
        return data;
      }
      return {
        ...data,
        id: String(requestId),
      };
    },
    // injecting no request id symbol allows us to request/response on id-less messages
    extractRequestId: (data) => data?.id ?? NO_REQUEST_ID,
  });

  // connects on demand, already open connections are ignored
  let isConnected = false,
    isConnecting = false,
    isDisconnecting = false;
  async function waitForConnected() {
    let waitedTimes = 0;
    while (!isConnected) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      // 100ms * 100 = 10s
      if (waitedTimes >= 100) {
        throw new Error('Waited 10 seconds but socket never connected.');
      }
      waitedTimes++;
    }
  }
  async function waitForDisconnected() {
    let waitedTimes = 0;
    while (isConnected) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      // 100ms * 100 = 10s
      if (waitedTimes >= 100) {
        throw new Error('Waited 10 seconds but socket never disconnected.');
      }
      waitedTimes++;
    }
  }
  async function connect() {
    if (isConnected) return;
    if (isConnecting) {
      return waitForConnected();
    }
    if (isDisconnecting) {
      await waitForDisconnected();
    }

    // open and initialize a connection, send the start message and flag as connected
    isConnected = false;
    isConnecting = true;
    await ws.open();
    const ack = await request(
      MessageType.ConnectionInit,
      connectionParams && typeof connectionParams === 'function'
        ? connectionParams()
        : connectionParams,
      NO_REQUEST_ID,
    );
    if (ack.type !== MessageType.ConnectionAck) {
      await ws.close();
      throw new Error('Connection not acknowledged');
    }
    isConnecting = false;
    isConnected = true;
  }

  // disconnects on demand, already closed connections are ignored
  async function disconnect() {
    isDisconnecting = true;
    if (isConnected) {
      // sends a terminate message, then closes the websocket
      send(MessageType.ConnectionTerminate);
    }
    await ws.close();
    isDisconnecting = false;
    isConnected = false;
  }

  // holds all currently subscribed sinks, will use this map
  // to dispatch messages to the correct destination and
  // as a decision system on when to unsubscribe
  const requestIdSink: Record<string, Sink> = {};
  function messageForSinkWithRequestId(requestId: string, message: Message) {
    let hasCompleted = false;
    Object.entries(requestIdSink).some(([sinkRequestId, sink]) => {
      if (requestId === sinkRequestId) {
        switch (message.type) {
          case MessageType.Data: {
            const err = checkServerPayload(message.payload);
            if (err) {
              sink.error(err);
              hasCompleted = true;
              return true;
            }
            sink.next(message.payload);
            break;
          }
          case MessageType.Error: {
            const err = checkServerPayload(message.payload);
            if (err) {
              sink.error(err);
            } else {
              sink.error(
                new Error('Unkown error received from the subscription server'),
              );
            }
            hasCompleted = true;
            break;
          }
          case MessageType.Complete: {
            sink.complete();
            hasCompleted = true;
            break;
          }
        }
        return true;
      }
      return false;
    });
    // if the sink got completed, remove it from the subscribed sinks
    if (hasCompleted) {
      delete requestIdSink[requestId];
    }
    // if there are no subscriptions left over, disconnect
    if (Object.keys(requestIdSink).length === 0) {
      // TODO-db-200603 report possible errors on disconnect
      disconnect();
    }
  }
  function errorAllSinks(error: Error) {
    Object.entries(requestIdSink).forEach(([, sink]) => sink.error(error));
  }

  // listens exclusively to messages with matching request ids
  function responseListener(data: unknown) {
    if (!isMessage(data)) {
      return errorAllSinks(
        new Error('Received an invalid message from the subscription server'),
      );
    }
    messageForSinkWithRequestId(data.id, data);
  }
  ws.onResponse.addListener(responseListener);

  function subscribe(payload: StartPayload, sink: Sink) {
    // generate a unique request id for this subscription
    const requestId = randomString();
    if (requestIdSink[requestId]) {
      sink.error(new Error(`Sink already registered for ID: ${requestId}`));
      return () => {
        /**/
      };
    }
    requestIdSink[requestId] = sink;

    connect()
      // start the subscription on a connection
      .then(() => send(MessageType.Start, payload, requestId))
      // will also error this sink because its added to the map above
      .catch(errorAllSinks);

    return () => {
      connect()
        // stop the subscription, after the server acknowledges this the sink will complete
        .then(() => send(MessageType.Stop, undefined, requestId))
        // will also error this sink because its added to the map above
        .catch(errorAllSinks);
    };
  }

  function send<T extends MessageType>(
    type: T,
    payload?: StartPayload,
    requestId?: string | typeof NO_REQUEST_ID,
  ) {
    if (requestId) {
      return ws.sendPacked({ id: requestId, type, payload });
    }
    return ws.sendPacked({ type, payload });
  }

  async function request<T extends MessageType>(
    type: T,
    payload?: StartPayload,
    requestId?: string | typeof NO_REQUEST_ID,
  ): Promise<Message> {
    return await ws.sendRequest({ type, payload }, { requestId });
  }

  return {
    subscribe(payload, sink) {
      return subscribe(payload, sink);
    },
    async dispose() {
      // complete all sinks
      Object.entries(requestIdSink).forEach(([, sink]) => sink.complete());
      // remove all subscriptions
      Object.keys(requestIdSink).forEach((key) => {
        delete requestIdSink[key];
      });
      // remove all listeners
      ws.removeAllListeners();
      // do disconnect
      return disconnect();
    },
  };
}

/**
 * Takes in the payload received from the server, parses and validates it,
 * checks for errors and returns a single error for all problematic cases.
 */
function checkServerPayload(
  payload: GraphQLResponse | null | undefined,
): Error | null {
  if (!payload) {
    return new Error('Received empty payload from the subscription server');
  }
  if (!isGraphQLResponse(payload)) {
    return new Error(
      'Received invalid payload structure from the subscription server',
    );
  }
  if ('errors' in payload && payload.errors) {
    return new Error(payload.errors.map(({ message }) => message).join(', '));
  }
  if (
    Object.keys(payload).length === 1 &&
    'message' in payload &&
    payload.message
  ) {
    return new Error(payload.message);
  }
  return null;
}

/** randomString does exactly what the name says. */
function randomString() {
  return Math.random().toString(36).substr(2, 6);
}
