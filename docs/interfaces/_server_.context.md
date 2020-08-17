[@enisdenjo/graphql-transport-ws](../README.md) › ["server"](../modules/_server_.md) › [Context](_server_.context.md)

# Interface: Context

## Hierarchy

* **Context**

## Index

### Properties

* [acknowledged](_server_.context.md#acknowledged)
* [connectionInitReceived](_server_.context.md#connectioninitreceived)
* [connectionParams](_server_.context.md#optional-connectionparams)
* [socket](_server_.context.md#readonly-socket)
* [subscriptions](_server_.context.md#subscriptions)

## Properties

###  acknowledged

• **acknowledged**: *boolean*

*Defined in [server.ts:146](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/server.ts#L146)*

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

___

###  connectionInitReceived

• **connectionInitReceived**: *boolean*

*Defined in [server.ts:140](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/server.ts#L140)*

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

___

### `Optional` connectionParams

• **connectionParams**? : *Readonly‹Record‹string, unknown››*

*Defined in [server.ts:148](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/server.ts#L148)*

The parameters passed during the connection initialisation.

___

### `Readonly` socket

• **socket**: *WebSocket*

*Defined in [server.ts:133](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/server.ts#L133)*

___

###  subscriptions

• **subscriptions**: *Record‹string, AsyncIterator‹unknown››*

*Defined in [server.ts:154](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/server.ts#L154)*

Holds the active subscriptions for this context.
Subscriptions are for `subscription` operations **only**,
other operations (`query`/`mutation`) are resolved immediately.
