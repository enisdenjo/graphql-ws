[graphql-ws](../README.md) / [client](../modules/client.md) / Client

# Interface: Client

[client](../modules/client.md).Client

## Hierarchy

- [`Disposable`](common.Disposable.md)

  ↳ **`Client`**

## Table of contents

### Methods

- [dispose](client.Client.md#dispose)
- [on](client.Client.md#on)
- [subscribe](client.Client.md#subscribe)
- [terminate](client.Client.md#terminate)

## Methods

### dispose

▸ **dispose**(): `void` \| `Promise`<`void`\>

Dispose of the instance and clear up resources.

#### Returns

`void` \| `Promise`<`void`\>

#### Inherited from

[Disposable](common.Disposable.md).[dispose](common.Disposable.md#dispose)

___

### on

▸ **on**<`E`\>(`event`, `listener`): () => `void`

Listens on the client which dispatches events about the socket state.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends [`Event`](../modules/client.md#event) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`EventListener`](../modules/client.md#eventlistener)<`E`\> |

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
| `payload` | [`SubscribePayload`](common.SubscribePayload.md) |
| `sink` | [`Sink`](common.Sink.md)<`ExecutionResult`<`Data`, `Extensions`\>\> |

#### Returns

`fn`

▸ (): `void`

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

##### Returns

`void`

___

### terminate

▸ **terminate**(): `void`

Terminates the WebSocket abruptly and immediately.

A close event `4499: Terminated` is issued to the current WebSocket and an
artificial `{ code: 4499, reason: 'Terminated', wasClean: false }` close-event-like
object is immediately emitted without waiting for the one coming from `WebSocket.onclose`.

Terminating is not considered fatal and a connection retry will occur as expected.

Useful in cases where the WebSocket is stuck and not emitting any events;
can happen on iOS Safari, see: https://github.com/enisdenjo/graphql-ws/discussions/290.

#### Returns

`void`
