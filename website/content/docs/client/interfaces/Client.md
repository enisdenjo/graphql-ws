---
title: "Interface: Client (client)"
sidebarTitle: "Client"
description: "Client (graphql-ws/client): Dispose of the instance and clear up resources."
---
Defined in: [src/client.ts:412](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L412)

## Extends

- [`Disposable`](/docs/common/interfaces/Disposable)

## Properties

### dispose()

> **dispose**: () => `void` \| `Promise`\<`void`\>

Defined in: [src/common.ts:57](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L57)

Dispose of the instance and clear up resources.

#### Returns

`void` \| `Promise`\<`void`\>

#### Inherited from

[`Disposable`](/docs/common/interfaces/Disposable).[`dispose`](/docs/common/interfaces/Disposable#dispose)

## Methods

### iterate()

> **iterate**\<`Data`, `Extensions`\>(`payload`): `AsyncIterableIterator`\<[`FormattedExecutionResult`](/docs/common/interfaces/FormattedExecutionResult)\<`Data`, `Extensions`\>\>

Defined in: [src/client.ts:430](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L430)

Subscribes and iterates over emitted results from the WebSocket
through the returned async iterator.

#### Type Parameters

• **Data** = `Record`\<`string`, `unknown`\>

• **Extensions** = `unknown`

#### Parameters

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

#### Returns

`AsyncIterableIterator`\<[`FormattedExecutionResult`](/docs/common/interfaces/FormattedExecutionResult)\<`Data`, `Extensions`\>\>

***

### on()

> **on**\<`E`\>(`event`, `listener`): () => `void`

Defined in: [src/client.ts:416](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L416)

Listens on the client which dispatches events about the socket state.

#### Type Parameters

• **E** *extends* [`Event`](/docs/client/type-aliases/Event)

#### Parameters

##### event

`E`

##### listener

[`EventListener`](/docs/client/type-aliases/EventListener)\<`E`\>

#### Returns

`Function`

##### Returns

`void`

***

### subscribe()

> **subscribe**\<`Data`, `Extensions`\>(`payload`, `sink`): () => `void`

Defined in: [src/client.ts:422](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L422)

Subscribes through the WebSocket following the config parameters. It
uses the `sink` to emit received data or errors. Returns a _cleanup_
function used for dropping the subscription and cleaning stuff up.

#### Type Parameters

• **Data** = `Record`\<`string`, `unknown`\>

• **Extensions** = `unknown`

#### Parameters

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

##### sink

[`Sink`](/docs/common/interfaces/Sink)\<[`FormattedExecutionResult`](/docs/common/interfaces/FormattedExecutionResult)\<`Data`, `Extensions`\>\>

#### Returns

`Function`

##### Returns

`void`

***

### terminate()

> **terminate**(): `void`

Defined in: [src/client.ts:445](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L445)

Terminates the WebSocket abruptly and immediately.

A close event `4499: Terminated` is issued to the current WebSocket and a
synthetic [TerminatedCloseEvent](/docs/client/classes/TerminatedCloseEvent) is immediately emitted without waiting for
the one coming from `WebSocket.onclose`.

Terminating is not considered fatal and a connection retry will occur as expected.

Useful in cases where the WebSocket is stuck and not emitting any events;
can happen on iOS Safari, see: https://github.com/enisdenjo/graphql-ws/discussions/290.

#### Returns

`void`
