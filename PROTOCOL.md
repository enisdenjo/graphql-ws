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
    | Operation // Client -> Server
    | ExecutionResult // Server -> Client
    | GraphQLError; // Server -> Client
}

enum MessageType {
  ConnectionInit = 'connection_init', // Client -> Server
  ConnectionAck = 'connection_ack', // Server -> Client

  Start = 'start', // Client -> Server
  Data = 'data', // Server -> Client
  Error = 'error', // Server -> Client
  Complete = 'complete', // Server -> Client
  Stop = 'stop', // Client -> Server
}

interface Operation {
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

The server must receive the connection initialisation message within the allowed waiting time specified in the `connectionInitWaitTimeout` parameter during the server setup. If the client does not request a connection within the allowed timeout, the server will close the socket with the close event: `4408: Connection timeout`.

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

### `Start`

Direction: **Client -> Server**

Requests an execution of the operation specified in the message `payload`. This message leverages the unique ID field to connect future server messages to the operation started by this message.

```typescript
interface StartMessage {
  id: '<unique-operation-id>';
  type: 'start';
  payload: Operation;
}

interface Operation {
  operationName: string;
  query: string;
  variables: Record<string, unknown>;
}
```

"Starting" an is allowed **only** after the server has acknowledged the connection through the `ConnectionAck` message, if the connection is not acknowledged/established, the socket will be closed immediately with a close event `4401: Unauthorized`.

### `Data`

Direction: **Server -> Client**

GraphQL execution result/data message requested through the `Start` message. It can be seen as a "response" to the `Start` message.

```typescript
import { ExecutionResult } from 'graphql';

interface DataMessage {
  id: '<unique-operation-id>';
  type: 'data';
  payload: ExecutionResult;
}
```

### `Error`

Direction: **Server -> Client**

GraphQL execution error caused by the `Start` message happening before the actual execution, usually due to validation errors.

```typescript
import { GraphQLError } from 'graphql';

interface DataMessage {
  id: '<unique-operation-id>';
  type: 'error';
  payload: GraphQLError;
}
```

### `Complete`

Direction: **Server -> Client**

Indicating that the GraphQL operation requested through the `Start` message has completed. No further `Data` will be sent through.

```typescript
interface CompleteMessage {
  id: '<unique-operation-id>';
  type: 'complete';
}
```

If the server has emitted an `Error` connected to the operation, the complete message will not be sent. The `Error` prevents the operation from execution so the complete message is superfluous.
