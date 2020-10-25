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
* [EventConnected](_client_.md#eventconnected)
* [EventConnecting](_client_.md#eventconnecting)
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

### EventConnected

Ƭ  **EventConnected**: \"connected\"

___

### EventConnecting

Ƭ  **EventConnecting**: \"connecting\"

___

### EventListener

Ƭ  **EventListener**\<E>: E *extends* EventConnecting ? () => void : E *extends* EventConnected ? (socket: WebSocket) => void : E *extends* EventClosed ? (event: CloseEvent) => void : never

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
