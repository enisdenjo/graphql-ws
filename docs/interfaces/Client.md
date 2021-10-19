[graphql-ws](../README.md) / Client

# Interface: Client

## Hierarchy

- [`Disposable`](Disposable.md)

  ↳ **`Client`**

## Table of contents

### Methods

- [dispose](Client.md#dispose)
- [on](Client.md#on)
- [subscribe](Client.md#subscribe)

## Methods

### dispose

▸ **dispose**(): `void` \| `Promise`<`void`\>

Dispose of the instance and clear up resources.

#### Returns

`void` \| `Promise`<`void`\>

#### Inherited from

[Disposable](Disposable.md).[dispose](Disposable.md#dispose)

___

### on

▸ **on**<`E`\>(`event`, `listener`): () => `void`

Listens on the client which dispatches events about the socket state.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends [`Event`](../README.md#event) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`EventListener`](../README.md#eventlistener)<`E`\> |

#### Returns

`fn`

▸ (): `void`

Listens on the client which dispatches events about the socket state.

##### Returns

`void`

___

### subscribe

▸ **subscribe**<`Data`, `Extensions`\>(`payload`, `sink`): () => `void`

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Data` | `Record`<`string`, `unknown`\> |
| `Extensions` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | [`SubscribePayload`](SubscribePayload.md) |
| `sink` | [`Sink`](Sink.md)<`ExecutionResult`<`Data`, `Extensions`\>\> |

#### Returns

`fn`

▸ (): `void`

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

##### Returns

`void`
