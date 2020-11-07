**[graphql-ws](../README.md)**

> [Globals](../README.md) / "client"

# Module: "client"

## Index

### Interfaces

* [Client](../interfaces/_client_.client.md)
* [ClientOptions](../interfaces/_client_.clientoptions.md)

### Type aliases

* [Event](_client_.md#event)
* [EventClosed](_client_.md#eventclosed)
* [EventClosedListener](_client_.md#eventclosedlistener)
* [EventConnected](_client_.md#eventconnected)
* [EventConnectedListener](_client_.md#eventconnectedlistener)
* [EventConnecting](_client_.md#eventconnecting)
* [EventConnectingListener](_client_.md#eventconnectinglistener)
* [EventListener](_client_.md#eventlistener)

### Functions

* [createClient](_client_.md#createclient)

## Type aliases

### Event

Ƭ  **Event**: [EventConnecting](_client_.md#eventconnecting) \| [EventConnected](_client_.md#eventconnected) \| [EventClosed](_client_.md#eventclosed)

___

### EventClosed

Ƭ  **EventClosed**: \"closed\"

___

### EventClosedListener

Ƭ  **EventClosedListener**: (event: unknown) => void

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

___

### EventConnected

Ƭ  **EventConnected**: \"connected\"

___

### EventConnectedListener

Ƭ  **EventConnectedListener**: (socket: unknown, payload?: Record\<string, unknown>) => void

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Also, the second argument is the optional payload that the server may
send through the `ConnectionAck` message.

___

### EventConnecting

Ƭ  **EventConnecting**: \"connecting\"

___

### EventConnectingListener

Ƭ  **EventConnectingListener**: () => void

___

### EventListener

Ƭ  **EventListener**\<E>: E *extends* EventConnecting ? EventConnectingListener : E *extends* EventConnected ? EventConnectedListener : E *extends* EventClosed ? EventClosedListener : never

#### Type parameters:

Name | Type |
------ | ------ |
`E` | [Event](_client_.md#event) |

## Functions

### createClient

▸ **createClient**(`options`: [ClientOptions](../interfaces/_client_.clientoptions.md)): [Client](../interfaces/_client_.client.md)

Creates a disposable GraphQL subscriptions client.

#### Parameters:

Name | Type |
------ | ------ |
`options` | [ClientOptions](../interfaces/_client_.clientoptions.md) |

**Returns:** [Client](../interfaces/_client_.client.md)
