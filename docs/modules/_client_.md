**[graphql-transport-ws](../README.md)**

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

*Defined in [client.ts:23](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/client.ts#L23)*

___

### EventClosed

Ƭ  **EventClosed**: \"closed\"

*Defined in [client.ts:22](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/client.ts#L22)*

___

### EventConnected

Ƭ  **EventConnected**: \"connected\"

*Defined in [client.ts:21](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/client.ts#L21)*

___

### EventConnecting

Ƭ  **EventConnecting**: \"connecting\"

*Defined in [client.ts:20](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/client.ts#L20)*

___

### EventListener

Ƭ  **EventListener**\<E>: E *extends* EventConnecting ? () => void : E *extends* EventConnected ? (socket: WebSocket) => void : E *extends* EventClosed ? (event: CloseEvent) => void : never

*Defined in [client.ts:25](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/client.ts#L25)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | [Event](_client_.md#event) |

## Functions

### createClient

▸ **createClient**(`options`: [ClientOptions](../interfaces/_client_.clientoptions.md)): [Client](../interfaces/_client_.client.md)

*Defined in [client.ts:93](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/client.ts#L93)*

Creates a disposable GraphQL subscriptions client.

#### Parameters:

Name | Type |
------ | ------ |
`options` | [ClientOptions](../interfaces/_client_.clientoptions.md) |

**Returns:** [Client](../interfaces/_client_.client.md)
