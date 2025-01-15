---
'graphql-ws': major
---

@fastify/websocket WebSocket in the context extra has been renamed from `connection` to `socket`

### Migrating from v5 to v6

```diff
import { makeHandler } from 'graphql-ws/use/@fastify/websocket';

makeHandler({
  schema(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  context(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onConnect(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onDisconnect(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onClose(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onSubscribe(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onOperation(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onError(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onNext(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
  onComplete(ctx) {
-   const websocket = ctx.connection;
+   const websocket = ctx.socket;
  },
});
```
