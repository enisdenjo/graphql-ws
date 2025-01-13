---
'graphql-ws': major
---

The `/lib/` part from imports has been removed, for example `graphql-ws/lib/use/ws` becomes `graphql-ws/use/ws`

### Migrating from v5 to v6

Simply remove the `/lib/` part from your graphql-ws imports that use a handler.

#### ws

```diff
- import { useServer } from 'graphql-ws/lib/use/ws';
+ import { useServer } from 'graphql-ws/use/ws';
```

#### uWebSockets.js

```diff
- import { makeBehavior } from 'graphql-ws/lib/use/uWebSockets';
+ import { makeBehavior } from 'graphql-ws/use/uWebSockets';
```

#### @fastify/websocket

```diff
- import { makeHandler } from 'graphql-ws/lib/use/@fastify/websocket';
+ import { makeHandler } from 'graphql-ws/use/@fastify/websocket';
```

#### Bun

```diff
- import { handleProtocols, makeHandler } from 'graphql-ws/lib/use/bun';
+ import { handleProtocols, makeHandler } from 'graphql-ws/use/bun';
```

#### Deno

```diff
- import { makeHandler } from 'https://esm.sh/graphql-ws/lib/use/deno';
+ import { makeHandler } from 'https://esm.sh/graphql-ws/use/deno';
```
