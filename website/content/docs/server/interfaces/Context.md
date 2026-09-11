---
title: "Interface: Context<P, E> (server)"
sidebarTitle: "Context"
description: "Context (graphql-ws/server): Indicates that the connection was acknowledged"
---
Defined in: [src/server.ts:517](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L517)

## Type Parameters

• **P** *extends* [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage)\[`"payload"`\] = [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage)\[`"payload"`\]

• **E** = `unknown`

## Properties

### acknowledged

> `readonly` **acknowledged**: `boolean`

Defined in: [src/server.ts:533](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L533)

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

***

### connectionInitReceived

> `readonly` **connectionInitReceived**: `boolean`

Defined in: [src/server.ts:527](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L527)

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

***

### connectionParams?

> `readonly` `optional` **connectionParams**: `Readonly`\<`P`\>

Defined in: [src/server.ts:535](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L535)

The parameters passed during the connection initialisation.

***

### extra

> **extra**: `E`

Defined in: [src/server.ts:554](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L554)

An extra field where you can store your own context values
to pass between callbacks.

***

### subscriptions

> `readonly` **subscriptions**: `Record`\<`string`, `null` \| `AsyncGenerator` \| `AsyncIterable`\<`unknown`\>\>

Defined in: [src/server.ts:546](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L546)

Holds the active subscriptions for this context. **All operations**
that are taking place are aggregated here. The user is _subscribed_
to an operation when waiting for result(s).

If the subscription behind an ID is an `AsyncIterator` - the operation
is streaming; on the contrary, if the subscription is `null` - it is simply
a reservation, meaning - the operation resolves to a single result or is still
pending/being prepared.
