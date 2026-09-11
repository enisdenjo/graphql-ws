---
title: "Function: makeHandler() (use/bun)"
sidebarTitle: "makeHandler"
description: "makeHandler (graphql-ws/use/bun): Use the server with Bun."
---
> **makeHandler**\<`P`, `E`\>(`options`): `WebSocketHandler`

Defined in: [src/use/bun.ts:67](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/bun.ts#L67)

Use the server with [Bun](https://bun.sh/).
This is a basic starter, feel free to copy the code over and adjust it to your needs

The WebSocket subprotocol is not available on the established socket and therefore
needs to be checked during the request handling.

Additionally, the keep-alive logic _seems_ to be handled by Bun seeing that
they default [`sendPingsAutomatically` to `true`](https://github.com/oven-sh/bun/blob/6a163cf933542506354dc836bd92693bcae5939b/src/deps/uws.zig#L893).

```ts
import { makeHandler, handleProtocols } from 'graphql-ws/use/bun';
import { schema } from './my-schema';

Bun.serve({
  fetch(req, server) {
    const [path, _search] = req.url.split('?');
    if (!path.endsWith('/graphql')) {
      return new Response('Not Found', { status: 404 });
    }
    if (req.headers.get('upgrade') != 'websocket') {
      return new Response('Upgrade Required', { status: 426 });
    }
    if (!handleProtocols(req.headers.get('sec-websocket-protocol') || '')) {
      return new Response('Bad Request', { status: 404 });
    }
    if (!server.upgrade(req)) {
      return new Response('Internal Server Error', { status: 500 });
    }
    return new Response();
  },
  websocket: makeHandler({ schema }),
  port: 4000,
});

console.log('Listening to port 4000');
```

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** *extends* `Record`\<`PropertyKey`, `unknown`\> = `Record`\<`PropertyKey`, `never`\>

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, [`Extra`](/docs/use/bun/interfaces/Extra) & `Partial`\<`E`\>\>

## Returns

`WebSocketHandler`
