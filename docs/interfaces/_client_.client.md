[graphql-transport-ws](../README.md) › ["client"](../modules/_client_.md) › [Client](_client_.client.md)

# Interface: Client

## Hierarchy

* [Disposable](_types_.disposable.md)

  ↳ **Client**

## Index

### Properties

* [dispose](_client_.client.md#dispose)

### Methods

* [on](_client_.client.md#on)
* [subscribe](_client_.client.md#subscribe)

## Properties

###  dispose

• **dispose**: *function*

*Inherited from [Disposable](_types_.disposable.md).[dispose](_types_.disposable.md#dispose)*

*Defined in [types.ts:17](https://github.com/enisdenjo/graphql-transport-ws/blob/757c6e9/src/types.ts#L17)*

Dispose of the instance and clear up resources.

#### Type declaration:

▸ (): *void | Promise‹void›*

## Methods

###  on

▸ **on**‹**E**›(`event`: E, `listener`: [EventListener](../modules/_client_.md#eventlistener)‹E›): *function*

*Defined in [client.ts:70](https://github.com/enisdenjo/graphql-transport-ws/blob/757c6e9/src/client.ts#L70)*

Listens on the client which dispatches events about the socket state.

**Type parameters:**

▪ **E**: *[Event](../modules/_client_.md#event)*

**Parameters:**

Name | Type |
------ | ------ |
`event` | E |
`listener` | [EventListener](../modules/_client_.md#eventlistener)‹E› |

**Returns:** *function*

▸ (): *void*

___

###  subscribe

▸ **subscribe**‹**T**›(`payload`: [SubscribePayload](_message_.subscribepayload.md), `sink`: [Sink](_types_.sink.md)‹T›): *function*

*Defined in [client.ts:76](https://github.com/enisdenjo/graphql-transport-ws/blob/757c6e9/src/client.ts#L76)*

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

**Type parameters:**

▪ **T**

**Parameters:**

Name | Type |
------ | ------ |
`payload` | [SubscribePayload](_message_.subscribepayload.md) |
`sink` | [Sink](_types_.sink.md)‹T› |

**Returns:** *function*

▸ (): *void*
