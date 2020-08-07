# GraphQL subscriptions over WebSocket Protocol

## Communication

The WebSocket sub-protocol for this specification is: `graphql-subscriptions-ws`

Messages are represented through the JSON structure and are stringified before being sent over the network. They are bi-directional, meaning both the server and the client conform to the specified message structure.

**All** messages contain the `type` field outlining the type or action this message describes. Depending on the type, the message can contain two more _optional_ fields:

- `id` used for uniquely identifying server responses and connecting them with the client requests
- `payload` holding the extra "payload" information to go with the specific message type

The server can close the socket (kick a client off) at any time. The close event received by the client is used to describe the fatal error.

The client terminates the socket and/or the connection by sending a `1000: Normal Closure` close event to the server.

```typescript
import { ExecutionResult, GraphQLError } from 'graphql';

interface Message {
  id?: string;
  type: MessageType;
  payload?:
    | SubscribeOperation // Client -> Server
    | ExecutionResult // Server -> Client
    | GraphQLError; // Server -> Client
}

enum MessageType {
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
```

## Message types

### `ConnectionInit`

Direction: **Client -> Server**

Indicates that the client wants to initialise the connection with the server within the socket. This connection is **not** the actual WebSocket connection (which we call "socket"), but is rather a frame within the exiting socket asking the server to allow future GraphQL operation requests.

The client can specify additional `connectionParams` which are sent through the `payload` field in outgoing message.

The server must receive the connection initialisation message within the allowed waiting time specified in the `connectionInitWaitTimeout` parameter during the server setup. If the client does not request a connection within the allowed timeout, the server will close the socket with the close event: `4408: Connection initialisation timeout`.

```typescript
interface ConnectionInitMessage {
  type: 'connection_init';
  payload?: Record<string, any>; // connectionParams
}
```

The server will respond by either:

- Sending a `ConnectionAck` message acknowledging that the connection has been successfully established. The server does not implement a `onConnect` callback or the implemented callback has returned `true` .
- Closing the socket with a close event `4403: Forbidden` indicating that the connection request has been denied because of access control. The server has returned `false` in the `onConnect` callback.
- Closing the socket with a close event `4400: <error-message>` indicating that the connection request has been denied because of an implementation specific error. The server has thrown an error in the `onConnect` callback, the thrown error's message is the `<error-message>` in the close event.

### `ConnectionAck`

Direction: **Server -> Client**

Potential response to the `ConnectionInit` message from the client acknowledging a successful connection with the server.

```typescript
interface ConnectionAckMessage {
  type: 'connection_ack';
}
```

The client is now **ready** to request GraphQL operations.

### `Subscribe`

Direction: **Client -> Server**

Requests a subscription operation specified in the message `payload`. This message leverages the unique ID field to connect future server messages to the operation started by this message.

```typescript
interface StartMessage {
  id: '<unique-operation-id>';
  type: 'subscribe';
  payload: SubscribeOperation;
}

interface SubscribeOperation {
  operationName: string;
  query: string;
  variables: Record<string, unknown>;
}
```

Subscribing an is allowed **only** after the server has acknowledged the connection through the `ConnectionAck` message, if the connection is not acknowledged/established, the socket will be closed immediately with a close event `4401: Unauthorized`.

### `Next`

Direction: **Server -> Client**

GraphQL subscription execution result message. It can be seen as a data stream requested by the `Subscribe` message.

```typescript
import { ExecutionResult } from 'graphql';

interface DataMessage {
  id: '<unique-operation-id>';
  type: 'next';
  payload: ExecutionResult;
}
```

### `Error`

Direction: **Server -> Client**

GraphQL subscription execution error caused by the `Next` message happening before the actual execution, usually due to validation errors.

```typescript
import { GraphQLError } from 'graphql';

interface DataMessage {
  id: '<unique-operation-id>';
  type: 'error';
  payload: GraphQLError;
}
```

### `Complete`

Direction: **Client -> Server**

Indicating that the client has stopped listening to the events and wants to complete the source stream. No further data events, relevant to the original operation, should be sent through.

```typescript
interface CompleteMessage {
  id: '<unique-operation-id>';
  type: 'complete';
}
```

## Examples

For the sake of clarity, the following examples demonstrate the communication protocol.

<h3 id="successful-connection-initialisation">Successful connection initialisation</h3>

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-subscriptions-ws`
2. _Server_ accepts the handshake and establishes a WebSocket connection (which we call "socket")
3. _Client_ immediately dispatches a `ConnectionInit` message setting the `connectionParams` according to the server implementation
4. _Server_ validates the connection initialisation request and dispatches a `ConnectionAck` message to the client
5. _Client_ has received the acknowledgement message and is now ready to request GraphQL operations

### Forbidden connection initialisation

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-subscriptions-ws`
2. _Server_ accepts the handshake and establishes a WebSocket connection (which we call "socket")
3. _Client_ immediately dispatches a `ConnectionInit` message setting the `connectionParams` according to the server implementation
4. _Server_ validates the connection initialisation request and decides that the client is not allowed to establish a connection
5. _Server_ terminates the socket by dispatching the close event `4403: Forbidden`
6. _Client_ reports an error using the close event reason (which is `Forbidden`).

### Erroneous connection initialisation

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-subscriptions-ws`
2. _Server_ accepts the handshake and establishes a WebSocket connection (which we call "socket")
3. _Client_ immediately dispatches a `ConnectionInit` message setting the `connectionParams` according to the server implementation
4. _Server_ tries validating the connection initialisation request but an error `I'm a teapot` is thrown
5. _Server_ terminates the socket by dispatching the close event `4400: I'm a teapot`
6. _Client_ reports an error using the close event reason (which is `I'm a teapot`).

### Connection initialisation timeout

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-subscriptions-ws`
2. _Server_ accepts the handshake and establishes a WebSocket connection (which we call "socket")
3. _Client_ does not dispatch a `ConnectionInit` message
4. _Server_ waits for the `ConnectionInit` message for the duration specified in the `connectionInitWaitTimeout` parameter
5. _Server_ waiting time has passed
6. _Server_ terminates the socket by dispatching the close event `4408: Connection initialisation timeout`
7. _Client_ reports an error using the close event reason (which is `Connection initialisation timeout`).

### Subscribe operation

_The client and the server has already gone through [successful connection initialisation](#successful-connection-initialisation)._

1. _Client_ generates a unique ID for the following operation
2. _Client_ dispatches the `Start` message with the, previously generated, unique ID through the `id` field and the requested subscription operation passed through the `payload` field
3. _Server_ validates the request through the `onSubscribe` callback and accepts it
4. _Server_ establishes a GraphQL subscription and listens for events in the source stream
5. _Server_ dispatches `Next` messages for every event in the underlying subscription source stream matching the client's unique ID
6. _Client_ stops the subscription by dispatching a `Complete` message with the matching unique ID
7. _Server_ effectively stops the GraphQL subscription by completing/disposing the underlying source stream and cleaning up related resources
