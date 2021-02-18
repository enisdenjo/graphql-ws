[graphql-ws](../README.md) / [client](../modules/client.md) / Client

# Interface: Client

[client](../modules/client.md).Client

## Hierarchy

* [*Disposable*](types.disposable.md)

  ↳ **Client**

## Table of contents

### Properties

- [dispose](client.client-1.md#dispose)

### Methods

- [on](client.client-1.md#on)
- [subscribe](client.client-1.md#subscribe)

## Properties

### dispose

• **dispose**: () => *void* \| *Promise*<void\>

Dispose of the instance and clear up resources.

#### Type declaration:

▸ (): *void* \| *Promise*<void\>

**Returns:** *void* \| *Promise*<void\>

Inherited from: [Disposable](types.disposable.md).[dispose](types.disposable.md#dispose)

## Methods

### on

▸ **on**<E\>(`event`: E, `listener`: [*EventListener*](../modules/client.md#eventlistener)<E\>): () => *void*

Listens on the client which dispatches events about the socket state.

#### Type parameters:

Name | Type |
:------ | :------ |
`E` | [*Event*](../modules/client.md#event) |

#### Parameters:

Name | Type |
:------ | :------ |
`event` | E |
`listener` | [*EventListener*](../modules/client.md#eventlistener)<E\> |

**Returns:** *function*

___

### subscribe

▸ **subscribe**<T\>(`payload`: [*SubscribePayload*](message.subscribepayload.md), `sink`: [*Sink*](types.sink.md)<T\>): () => *void*

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

#### Type parameters:

Name | Default |
:------ | :------ |
`T` | *unknown* |

#### Parameters:

Name | Type |
:------ | :------ |
`payload` | [*SubscribePayload*](message.subscribepayload.md) |
`sink` | [*Sink*](types.sink.md)<T\> |

**Returns:** *function*
