[@enisdenjo/graphql-transport-ws](../README.md) › ["client"](../modules/_client_.md) › [Client](_client_.client.md)

# Interface: Client

## Hierarchy

* Disposable

  ↳ **Client**

## Index

### Properties

* [dispose](_client_.client.md#dispose)

### Methods

* [subscribe](_client_.client.md#subscribe)

## Properties

###  dispose

• **dispose**: *function*

*Inherited from [Client](_client_.client.md).[dispose](_client_.client.md#dispose)*

*Defined in [types.d.ts:16](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/types.d.ts#L16)*

#### Type declaration:

▸ (): *Promise‹void›*

## Methods

###  subscribe

▸ **subscribe**‹**T**›(`payload`: SubscribeMessage["payload"], `sink`: Sink‹T›): *function*

*Defined in [client.ts:33](https://github.com/enisdenjo/graphql-transport-ws/blob/eb9f7f0/src/client.ts#L33)*

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

**Type parameters:**

▪ **T**

**Parameters:**

Name | Type |
------ | ------ |
`payload` | SubscribeMessage["payload"] |
`sink` | Sink‹T› |

**Returns:** *function*

▸ (): *void*
