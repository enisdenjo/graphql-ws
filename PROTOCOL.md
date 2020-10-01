# GraphQL over WebSocket Protocol

## Nomenclature

- **Socket** is the main WebSocket communication channel between the _server_ and the _client_
- **Connection** is a connection **within the established socket** describing a "connection" through which the operation requests will be communicated

## Communication

The WebSocket sub-protocol for this specification is: `graphql-transport-ws`.

Messages are represented through the JSON structure and are stringified before being sent over the network. They are bidirectional, meaning both the server and the client must conform to the specified message structure.

**All** messages contain the `type` field outlining the action this message describes. Depending on the type, the message can contain two more _optional_ fields:

- `id` used for uniquely identifying server responses and connecting them with the client's requests
- `payload` holding the extra "payload" information to go with the specific message type

The server can close the socket (kick the client off) at any time. The close event dispatched by the server is used to describe the fatal error to the client.

The client closes the socket and the connection by dispatching a `1000: Normal Closure` close event to the server indicating a normal closure.

## Keep-Alive

The server will occasionally check if the client is still "alive", available and listening. In order to perform this check, implementation leverages the standardized [Pings and Pongs: The Heartbeat of WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets).

Keep-Alive interval and the "pong wait" timeout can be tuned by using the accompanying configuration parameter on the server.

Ping and Pong feature is a mandatory requirement by [The WebSocket Protocol](https://tools.ietf.org/html/rfc6455#section-5.5.2). All clients that don't support it are **not** RFC6455 compliant and will simply have their socket terminated after the pong wait has passed.

## Message types

### `ConnectionInit`

Direction: **Client -> Server**

Indicates that the client wants to establish a connection within the existing socket. This connection is **not** the actual WebSocket communication channel, but is rather a frame within it asking the server to allow future operation requests.

The client can specify additional `connectionParams` which are sent through the `payload` field in the outgoing message.

The server must receive the connection initialisation message within the allowed waiting time specified in the `connectionInitWaitTimeout` parameter during the server setup. If the client does not request a connection within the allowed timeout, the server will close the socket with the event: `4408: Connection initialisation timeout`.

If the server receives more than one `ConnectionInit` message at any given time, the server will close the socket with the event `4429: Too many initialisation requests`.

```typescript
interface ConnectionInitMessage {
  type: 'connection_init';
  payload?: Record<string, unknown>; // connectionParams
}
```

The server will respond by either:

- Dispatching a `ConnectionAck` message acknowledging that the connection has been successfully established. The server does not implement the `onConnect` callback or the implemented callback has returned `true`.
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

The client is now **ready** to request subscription operations.

### `Subscribe`

Direction: **Client -> Server**

Requests an operation specified in the message `payload`. This message provides a unique ID field to connect future server messages to the operation started by this message.

If there is already an active subscriber for a `subscription` operation matching the provided ID, the server will close the socket immediately with the event `4409: Subscriber for <unique-operation-id> already exists`. Since `query` and `mutation` resolve to a single emitted value, their subscription does not require reservations for additional future events. Having this in mind, the server may not assert this rule for these operations.

```typescript
import { DocumentNode } from 'graphql';

interface SubscribeMessage {
  id: '<unique-operation-id>';
  type: 'subscribe';
  payload: {
    operationName?: string | null;
    query: string | DocumentNode;
    variables?: Record<string, unknown> | null;
  };
}
```

Executing operations is allowed **only** after the server has acknowledged the connection through the `ConnectionAck` message, if the connection is not acknowledged, the socket will be closed immediately with the event `4401: Unauthorized`.

### `Next`

Direction: **Server -> Client**

Operation execution result message.

- If the operation is a `query` or `mutation`, the message can be seen as the final execution result. This message is followed by the `Complete` message indicating the completion of the operation.
- If the operation is a `subscription`, the message can be seen as an event in the source stream requested by the `Subscribe` message.

```typescript
import { ExecutionResult } from 'graphql';

interface NextMessage {
  id: '<unique-operation-id>';
  type: 'next';
  payload: ExecutionResult;
}
```

### `Error`

Direction: **Server -> Client**

Operation execution error(s) triggered by the `Next` message happening before the actual execution, usually due to validation errors.

```typescript
import { GraphQLError } from 'graphql';

interface ErrorMessage {
  id: '<unique-operation-id>';
  type: 'error';
  payload: GraphQLError[];
}
```

### `Complete`

Direction: **bidirectional**

- **Server -> Client** indicates that the requested operation execution has completed. If the server dispatched the `Error` message relative to the original `Subscribe` message, no `Complete` message will be emitted.

- **Client -> Server** (for `subscription` operations only) indicating that the client has stopped listening to the events and wants to complete the source stream. No further data events, relevant to the original subscription, should be sent through.

```typescript
interface CompleteMessage {
  id: '<unique-operation-id>';
  type: 'complete';
}
```

### Invalid message

Direction: **bidirectional**

Receiving a message of a type or format which is not specified in this document will result in an **immediate** socket closure with the event `4400: <error-message>`. The `<error-message>` can be vaguely descriptive on why the received message is invalid.

## Examples

For the sake of clarity, the following examples demonstrate the communication protocol.

<h3 id="successful-connection-initialisation">Successful connection initialisation</h3>

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-transport-ws`
1. _Server_ accepts the handshake and establishes a WebSocket communication channel (which we call "socket")
1. _Client_ immediately dispatches a `ConnectionInit` message setting the `connectionParams` according to the server implementation
1. _Server_ validates the connection initialisation request and dispatches a `ConnectionAck` message to the client on successful connection
1. _Client_ has received the acknowledgement message and is now ready to request operation executions

### Forbidden connection initialisation

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-transport-ws`
1. _Server_ accepts the handshake and establishes a WebSocket communication channel (which we call "socket")
1. _Client_ immediately dispatches a `ConnectionInit` message setting the `connectionParams` according to the server implementation
1. _Server_ validates the connection initialisation request and decides that the client is not allowed to establish a connection
1. _Server_ closes the socket by dispatching the event `4403: Forbidden`
1. _Client_ reports an error using the close event reason (which is `Forbidden`)

### Erroneous connection initialisation

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-transport-ws`
1. _Server_ accepts the handshake and establishes a WebSocket communication channel (which we call "socket")
1. _Client_ immediately dispatches a `ConnectionInit` message setting the `connectionParams` according to the server implementation
1. _Server_ tries validating the connection initialisation request but an error `I'm a teapot` is thrown
1. _Server_ closes the socket by dispatching the event `4400: I'm a teapot`
1. _Client_ reports an error using the close event reason (which is `I'm a teapot`)

### Connection initialisation timeout

1. _Client_ sends a WebSocket handshake request with the sub-protocol: `graphql-transport-ws`
1. _Server_ accepts the handshake and establishes a WebSocket communication channel (which we call "socket")
1. _Client_ does not dispatch a `ConnectionInit` message
1. _Server_ waits for the `ConnectionInit` message for the duration specified in the `connectionInitWaitTimeout` parameter
1. _Server_ waiting time has passed
1. _Server_ closes the socket by dispatching the event `4408: Connection initialisation timeout`
1. _Client_ reports an error using the close event reason (which is `Connection initialisation timeout`)

### Query/Mutation operation

_The client and the server has already gone through [successful connection initialisation](#successful-connection-initialisation)._

1. _Client_ generates a unique ID for the following operation
1. _Client_ dispatches the `Subscribe` message with the, previously generated, unique ID through the `id` field and the requested `query`/`mutation` operation passed through the `payload` field
1. _Server_ triggers the `onSubscribe` callback, if specified, and uses the returned `ExecutionArgs` for the operation
1. _Server_ validates the request and executes the GraphQL operation
1. _Server_ dispatches a `Next` message with the execution result matching the client's unique ID
1. _Server_ dispatches the `Complete` message with the matching unique ID indicating that the execution has completed
1. _Server_ triggers the `onComplete` callback, if specified

### Subscribe operation

_The client and the server has already gone through [successful connection initialisation](#successful-connection-initialisation)._

1. _Client_ generates a unique ID for the following operation
1. _Client_ dispatches the `Subscribe` message with the, previously generated, unique ID through the `id` field and the requested subscription operation passed through the `payload` field
1. _Server_ triggers the `onSubscribe` callback, if specified, and uses the returned `ExecutionArgs` for the operation
1. _Server_ validates the request, establishes a GraphQL subscription and listens for events in the source stream
1. _Server_ dispatches `Next` messages for every event in the underlying subscription source stream matching the client's unique ID
1. _Client_ stops the subscription by dispatching a `Complete` message with the matching unique ID
1. _Server_ effectively stops the GraphQL subscription by completing/disposing the underlying source stream and cleaning up related resources
1. _Server_ triggers the `onComplete` callback, if specified
