---
'graphql-ws': major
---

Errors thrown from subscription iterables will be caught and reported through the `ErrorMessage`

Compared to the behaviour before, which terminated the whole WebSocket connection - those errors are now gracefully reported and terminate only the specific subscription that threw the error.

There's been [an editorial change in the GraphQL Spec suggesting this being the correct approach](https://github.com/graphql/graphql-spec/pull/1099).

Also, if you'd like to get involved and ideally drop your opinion about whether iterable errors should be reported as errors or `ExecutionResult`s with `errors` field set, [please read more here](https://github.com/graphql/graphql-spec/pull/1127).

### Migrating from v5 to v6

If you had used the suggested "ws server usage with custom subscribe method that gracefully handles thrown errors" recipe, you can simply remove it since this behaviour is now baked in.

```diff
import { subscribe } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws'; // yarn add ws

const wsServer = new WebSocketServer({
  port: 4000,
  path: '/graphql',
});

useServer(
  {
    schema,
-   async subscribe(...args) {
-     const result = await subscribe(...args);
-     if ('next' in result) {
-       // is an async iterable, augment the next method to handle thrown errors
-       const originalNext = result.next;
-       result.next = async () => {
-         try {
-           return await originalNext();
-         } catch (err) {
-           // gracefully handle the error thrown from the next method
-           return { value: { errors: [err] } };
-         }
-       };
-     }
-     return result;
-   },
  },
  wsServer,
);
```
