[graphql-transport-ws](../README.md) › ["client"](../modules/_client_.md) › [Client](_client_.client.md)

# Interface: Client

## Hierarchy

* [Disposable](_types_.disposable.md)

  ↳ **Client**

## Index

### Properties

* [dispose](_client_.client.md#dispose)

### Methods

* [subscribe](_client_.client.md#subscribe)

## Properties

###  dispose

• **dispose**: *function*

*Inherited from [Disposable](_types_.disposable.md).[dispose](_types_.disposable.md#dispose)*

*Defined in [types.ts:17](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/types.ts#L17)*

Dispose of the instance and clear up resources.

#### Type declaration:

▸ (): *void | Promise‹void›*

## Methods

###  subscribe

▸ **subscribe**‹**T**›(`payload`: [SubscribePayload](_message_.subscribepayload.md), `sink`: [Sink](_types_.sink.md)‹T›): *function*

*Defined in [client.ts:33](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/client.ts#L33)*

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
