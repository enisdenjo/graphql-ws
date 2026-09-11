---
title: "Function: useServer() (use/ws)"
sidebarTitle: "useServer"
description: "useServer (graphql-ws/use/ws): Use the server on a ws ws server."
---
> **useServer**\<`P`, `E`\>(`options`, `ws`, `keepAlive`): [`Disposable`](/docs/common/interfaces/Disposable)

Defined in: [src/use/ws.ts:39](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/ws.ts#L39)

Use the server on a [ws](https://github.com/websockets/ws) ws server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** *extends* `Record`\<`PropertyKey`, `unknown`\> = `Record`\<`PropertyKey`, `never`\>

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, [`Extra`](/docs/use/ws/interfaces/Extra) & `Partial`\<`E`\>\>

### ws

`WebSocketServer`

### keepAlive

`number` = `12_000`

The timeout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#pings_and_pongs_the_heartbeat_of_websockets)
to check that the link between the clients and the server is operating and to prevent the link
from being broken due to idling.

**Default**

```ts
12_000 // 12 seconds
```

## Returns

[`Disposable`](/docs/common/interfaces/Disposable)
