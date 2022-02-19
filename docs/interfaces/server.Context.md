[graphql-ws](../README.md) / [server](../modules/server.md) / Context

# Interface: Context<P, E\>

[server](../modules/server.md).Context

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`ConnectionInitMessage`](common.ConnectionInitMessage.md)[``"payload"``][`ConnectionInitMessage`](common.ConnectionInitMessage.md)[``"payload"``] |
| `E` | `unknown` |

## Table of contents

### Properties

- [acknowledged](server.Context.md#acknowledged)
- [connectionInitReceived](server.Context.md#connectioninitreceived)
- [connectionParams](server.Context.md#connectionparams)
- [extra](server.Context.md#extra)
- [subscriptions](server.Context.md#subscriptions)

## Properties

### acknowledged

• `Readonly` **acknowledged**: `boolean`

Indicates that the connection was acknowledged
by having dispatched the `ConnectionAck` message
to the related client.

___

### connectionInitReceived

• `Readonly` **connectionInitReceived**: `boolean`

Indicates that the `ConnectionInit` message
has been received by the server. If this is
`true`, the client wont be kicked off after
the wait timeout has passed.

___

### connectionParams

• `Optional` `Readonly` **connectionParams**: `Readonly`<`P`\>

The parameters passed during the connection initialisation.

___

### extra

• **extra**: `E`

An extra field where you can store your own context values
to pass between callbacks.

___

### subscriptions

• `Readonly` **subscriptions**: `Record`<`string`, ``null`` \| `AsyncGenerator`<`unknown`, `any`, `unknown`\> \| `AsyncIterable`<`unknown`\>\>

Holds the active subscriptions for this context. **All operations**
that are taking place are aggregated here. The user is _subscribed_
to an operation when waiting for result(s).

If the subscription behind an ID is an `AsyncIterator` - the operation
is streaming; on the contrary, if the subscription is `null` - it is simply
a reservation, meaning - the operation resolves to a single result or is still
pending/being prepared.
