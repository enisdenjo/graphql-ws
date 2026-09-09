---
title: "Interface: Server<E> (server)"
sidebarTitle: "Server"
description: "Server (graphql-ws/server): New socket has been established. The lib will validate"
---
Defined in: [src/server.ts:435](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L435)

## Type Parameters

• **E** = `undefined`

## Methods

### opened()

> **opened**(`socket`, `ctxExtra`): (`code`?, `reason`?) => `Promise`\<`void`\>

Defined in: [src/server.ts:450](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L450)

New socket has been established. The lib will validate
the protocol and use the socket accordingly. Returned promise
will resolve after the socket closes.

The second argument will be passed in the `extra` field
of the `Context`. You may pass the initial request or the
original WebSocket, if you need it down the road.

Returns a function that should be called when the same socket
has been closed, for whatever reason. The close code and reason
must be passed for reporting to the `onDisconnect` callback. Returned
promise will resolve once the internal cleanup is complete.

#### Parameters

##### socket

[`WebSocket`](/docs/server/interfaces/WebSocket)

##### ctxExtra

`E`

#### Returns

`Function`

##### Parameters

###### code?

`number`

###### reason?

`string`

##### Returns

`Promise`\<`void`\>
