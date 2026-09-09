---
title: "Function: makeHandler() (use/@fastify/websocket)"
sidebarTitle: "makeHandler"
description: "makeHandler (graphql-ws/use/@fastify/websocket): Make a handler to use on a @fastify/websocket route."
---
> **makeHandler**\<`P`, `E`\>(`options`, `keepAlive`): `WebsocketHandler`

Defined in: [src/use/@fastify/websocket.ts:35](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/@fastify/websocket.ts#L35)

Make a handler to use on a [@fastify/websocket](https://github.com/fastify/fastify-websocket) route.
This is a basic starter, feel free to copy the code over and adjust it to your needs

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** *extends* `Record`\<`PropertyKey`, `unknown`\> = `Record`\<`PropertyKey`, `never`\>

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, [`Extra`](/docs/use/@fastify/websocket/interfaces/Extra) & `Partial`\<`E`\>\>

### keepAlive

`number` = `12_000`

The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#pings_and_pongs_the_heartbeat_of_websockets)
to check that the link between the clients and the server is operating and to prevent the link
from being broken due to idling.

**Default**

```ts
12_000 // 12 seconds
```

## Returns

`WebsocketHandler`
