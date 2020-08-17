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

*Defined in [server.ts:147](https://github.com/enisdenjo/graphql-transport-ws/blob/923625c/src/server.ts#L147)*

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

___

###  connectionInitReceived

• **connectionInitReceived**: *boolean*

*Defined in [server.ts:141](https://github.com/enisdenjo/graphql-transport-ws/blob/923625c/src/server.ts#L141)*

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

___

### `Optional` connectionParams

• **connectionParams**? : *Readonly‹Record‹string, unknown››*

*Defined in [server.ts:149](https://github.com/enisdenjo/graphql-transport-ws/blob/923625c/src/server.ts#L149)*

The parameters passed during the connection initialisation.

___

### `Readonly` socket

• **socket**: *WebSocket*

*Defined in [server.ts:134](https://github.com/enisdenjo/graphql-transport-ws/blob/923625c/src/server.ts#L134)*

___

###  subscriptions

• **subscriptions**: *Record‹[UUID](../modules/_types_d_.md#uuid), AsyncIterator‹unknown››*

*Defined in [server.ts:155](https://github.com/enisdenjo/graphql-transport-ws/blob/923625c/src/server.ts#L155)*

Holds the active subscriptions for this context.
Subscriptions are for `subscription` operations **only**,
other operations (`query`/`mutation`) are resolved immediately.
