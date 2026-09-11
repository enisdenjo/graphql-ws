---
title: "Function: makeHandler() (use/deno)"
sidebarTitle: "makeHandler"
description: "makeHandler (graphql-ws/use/deno): Use the server with Deno."
---
> **makeHandler**\<`P`, `E`\>(`options`): (`socket`) => `void`

Defined in: [src/use/deno.ts:63](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/deno.ts#L63)

Use the server with [Deno](https://deno.com/).
This is a basic starter, feel free to copy the code over and adjust it to your needs.

The keep-alive is set in `Deno.upgradeWebSocket` during the upgrade.

Additionally, the required WebSocket protocol is also defined during the upgrade,
the correct example being:

```ts
import { serve } from 'https://deno.land/std/http/mod.ts';
import {
  makeHandler,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
} from 'https://esm.sh/graphql-ws/use/deno';
import { schema } from './my-schema.ts';

const handler = makeHandler({ schema });

serve(
  (req: Request) => {
    const [path, _search] = req.url.split('?');
    if (!path.endsWith('/graphql')) {
      return new Response('Not Found', { status: 404 });
    }
    if (req.headers.get('upgrade') != 'websocket') {
      return new Response('Upgrade Required', { status: 426 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req, {
      protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
      idleTimeout: 12_000,
    });
    handler(socket);
    return response;
  },
  { port: 4000 },
);
```

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** *extends* `Record`\<`PropertyKey`, `unknown`\> = `Record`\<`PropertyKey`, `never`\>

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, [`Extra`](/docs/use/deno/interfaces/Extra) & `Partial`\<`E`\>\>

## Returns

`Function`

### Parameters

#### socket

`WebSocket`

### Returns

`void`
