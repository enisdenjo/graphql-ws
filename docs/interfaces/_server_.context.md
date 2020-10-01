[graphql-transport-ws](../README.md) › ["server"](../modules/_server_.md) › [Context](_server_.context.md)

# Interface: Context

## Hierarchy

* **Context**

## Index

### Properties

* [acknowledged](_server_.context.md#acknowledged)
* [connectionInitReceived](_server_.context.md#connectioninitreceived)
* [connectionParams](_server_.context.md#optional-connectionparams)
* [request](_server_.context.md#readonly-request)
* [socket](_server_.context.md#readonly-socket)
* [subscriptions](_server_.context.md#subscriptions)

## Properties

###  acknowledged

• **acknowledged**: *boolean*

*Defined in [server.ts:194](https://github.com/enisdenjo/graphql-transport-ws/blob/e35a1ac/src/server.ts#L194)*

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

___

###  connectionInitReceived

• **connectionInitReceived**: *boolean*

*Defined in [server.ts:188](https://github.com/enisdenjo/graphql-transport-ws/blob/e35a1ac/src/server.ts#L188)*

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

___

### `Optional` connectionParams

• **connectionParams**? : *Readonly‹Record‹string, unknown››*

*Defined in [server.ts:196](https://github.com/enisdenjo/graphql-transport-ws/blob/e35a1ac/src/server.ts#L196)*

The parameters passed during the connection initialisation.

___

### `Readonly` request

• **request**: *IncomingMessage*

*Defined in [server.ts:181](https://github.com/enisdenjo/graphql-transport-ws/blob/e35a1ac/src/server.ts#L181)*

The initial HTTP request before the actual
socket and connection is established.

___

### `Readonly` socket

• **socket**: *WebSocket*

*Defined in [server.ts:176](https://github.com/enisdenjo/graphql-transport-ws/blob/e35a1ac/src/server.ts#L176)*

The actual WebSocket connection between the server and the client.

___

###  subscriptions

• **subscriptions**: *Record‹[ID](../modules/_types_.md#id), AsyncIterator‹unknown››*

*Defined in [server.ts:202](https://github.com/enisdenjo/graphql-transport-ws/blob/e35a1ac/src/server.ts#L202)*

Holds the active subscriptions for this context.
Subscriptions are for `subscription` operations **only**,
other operations (`query`/`mutation`) are resolved immediately.
