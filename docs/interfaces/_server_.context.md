**[graphql-transport-ws](../README.md)**

> [Globals](../README.md) / ["server"](../modules/_server_.md) / Context

# Interface: Context

## Hierarchy

* **Context**

## Index

### Properties

* [acknowledged](_server_.context.md#acknowledged)
* [connectionInitReceived](_server_.context.md#connectioninitreceived)
* [connectionParams](_server_.context.md#connectionparams)
* [request](_server_.context.md#request)
* [socket](_server_.context.md#socket)
* [subscriptions](_server_.context.md#subscriptions)

## Properties

### acknowledged

•  **acknowledged**: boolean

*Defined in [server.ts:195](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/server.ts#L195)*

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

___

### connectionInitReceived

•  **connectionInitReceived**: boolean

*Defined in [server.ts:189](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/server.ts#L189)*

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

___

### connectionParams

• `Optional` **connectionParams**: Readonly\<Record\<string, unknown>>

*Defined in [server.ts:197](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/server.ts#L197)*

The parameters passed during the connection initialisation.

___

### request

• `Readonly` **request**: IncomingMessage

*Defined in [server.ts:182](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/server.ts#L182)*

The initial HTTP request before the actual
socket and connection is established.

___

### socket

• `Readonly` **socket**: WebSocket

*Defined in [server.ts:177](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/server.ts#L177)*

The actual WebSocket connection between the server and the client.

___

### subscriptions

•  **subscriptions**: Record\<[ID](../modules/_types_.md#id), AsyncIterator\<unknown>>

*Defined in [server.ts:203](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/server.ts#L203)*

Holds the active subscriptions for this context.
Subscriptions are for `subscription` operations **only**,
other operations (`query`/`mutation`) are resolved immediately.
