---
title: "Interface: WebSocket (server)"
sidebarTitle: "WebSocket"
description: "WebSocket (graphql-ws/server): The subprotocol of the WebSocket. Will be used"
---
Defined in: [src/server.ts:457](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L457)

## Properties

### protocol

> `readonly` **protocol**: `string`

Defined in: [src/server.ts:462](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L462)

The subprotocol of the WebSocket. Will be used
to validate against the supported ones.

## Methods

### close()

> **close**(`code`?, `reason`?): `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:483](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L483)

Closes the socket gracefully. Will always provide
the appropriate code and close reason. `onDisconnect`
callback will be called.

The returned promise is used to control the graceful
closure.

#### Parameters

##### code?

`number`

##### reason?

`string`

#### Returns

`void` \| `Promise`\<`void`\>

***

### onMessage()

> **onMessage**(`cb`): `void`

Defined in: [src/server.ts:497](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L497)

Called when message is received. The library requires the data
to be a `string`.

All operations requested from the client will block the promise until
completed, this means that the callback will not resolve until all
subscription events have been emitted (or until the client has completed
the stream), or until the query/mutation resolves.

Exceptions raised during any phase of operation processing will
reject the callback's promise, catch them and communicate them
to your clients however you wish.

#### Parameters

##### cb

(`data`) => `Promise`\<`void`\>

#### Returns

`void`

***

### onPing()?

> `optional` **onPing**(`payload`): `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:507](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L507)

Implement a listener for the `PingMessage` sent from the client to the server.
If the client sent the ping with a payload, it will be passed through the
first argument.

If this listener is implemented, the server will NOT automatically reply
to any pings from the client. Implementing it makes it your responsibility
to decide how and when to respond.

#### Parameters

##### payload

`undefined` | `Record`\<`string`, `unknown`\>

#### Returns

`void` \| `Promise`\<`void`\>

***

### onPong()?

> `optional` **onPong**(`payload`): `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:513](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L513)

Implement a listener for the `PongMessage` sent from the client to the server.
If the client sent the pong with a payload, it will be passed through the
first argument.

#### Parameters

##### payload

`undefined` | `Record`\<`string`, `unknown`\>

#### Returns

`void` \| `Promise`\<`void`\>

***

### send()

> **send**(`data`): `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:474](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L474)

Sends a message through the socket. Will always
provide a `string` message.

Please take care that the send is ready. Meaning,
only provide a truly OPEN socket through the `opened`
method of the `Server`.

The returned promise is used to control the flow of data
(like handling backpressure).

#### Parameters

##### data

`string`

#### Returns

`void` \| `Promise`\<`void`\>
