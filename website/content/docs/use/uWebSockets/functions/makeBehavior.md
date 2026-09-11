---
title: "Function: makeBehavior() (use/uWebSockets)"
sidebarTitle: "makeBehavior"
description: "makeBehavior (graphql-ws/use/uWebSockets): Make the behaviour for using a uWebSockets.js WebSocket server."
---
> **makeBehavior**\<`P`, `E`\>(`options`, `behavior`, `keepAlive`): `uWS.WebSocketBehavior`\<`unknown`\>

Defined in: [src/use/uWebSockets.ts:70](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L70)

Make the behaviour for using a [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) WebSocket server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** *extends* `Record`\<`PropertyKey`, `unknown`\> = `Record`\<`PropertyKey`, `never`\>

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, [`Extra`](/docs/use/uWebSockets/interfaces/Extra) & `Partial`\<`E`\>\>

### behavior

`WebSocketBehavior`\<`unknown`\> = `{}`

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

`uWS.WebSocketBehavior`\<`unknown`\>
