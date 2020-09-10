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

*Defined in [server.ts:183](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L183)*

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

___

###  connectionInitReceived

• **connectionInitReceived**: *boolean*

*Defined in [server.ts:177](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L177)*

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

___

### `Optional` connectionParams

• **connectionParams**? : *Readonly‹Record‹string, unknown››*

*Defined in [server.ts:185](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L185)*

The parameters passed during the connection initialisation.

___

### `Readonly` request

• **request**: *IncomingMessage*

*Defined in [server.ts:170](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L170)*

The initial HTTP request before the actual
socket and connection is established.

___

### `Readonly` socket

• **socket**: *WebSocket*

*Defined in [server.ts:165](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L165)*

The actual WebSocket connection between the server and the client.

___

###  subscriptions

• **subscriptions**: *Record‹[UUID](../modules/_types_.md#uuid), AsyncIterator‹unknown››*

*Defined in [server.ts:191](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L191)*

Holds the active subscriptions for this context.
Subscriptions are for `subscription` operations **only**,
other operations (`query`/`mutation`) are resolved immediately.
