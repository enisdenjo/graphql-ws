[graphql-ws](../README.md) / [client](../modules/client.md) / Client

# Interface: Client

[client](../modules/client.md).Client

## Hierarchy

- [Disposable](common.disposable.md)

  ↳ **Client**

## Table of contents

### Properties

- [dispose](client.client-1.md#dispose)

### Methods

- [on](client.client-1.md#on)
- [subscribe](client.client-1.md#subscribe)

## Properties

### dispose

• **dispose**: () => `void` \| `Promise`<void\>

#### Type declaration

▸ (): `void` \| `Promise`<void\>

Dispose of the instance and clear up resources.

##### Returns

`void` \| `Promise`<void\>

#### Inherited from

[Disposable](common.disposable.md).[dispose](common.disposable.md#dispose)

## Methods

### on

▸ **on**<E\>(`event`, `listener`): () => `void`

Listens on the client which dispatches events about the socket state.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | `E`: [Event](../modules/client.md#event) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [EventListener](../modules/client.md#eventlistener)<E\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

___

### subscribe

▸ **subscribe**<T\>(`payload`, `sink`): () => `void`

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` = `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | [SubscribePayload](common.subscribepayload.md) |
| `sink` | [Sink](common.sink.md)<T\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`
