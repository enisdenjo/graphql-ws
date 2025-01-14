---
'graphql-ws': minor
---

Client is truly zero-dependency, not even a peer dependency on `graphql`

In non-browser environments, you can use only the client and not even depend on `graphql` by importing from `graphql-ws/client`.

```ts
import { createClient } from 'graphql-ws/client';

const client = createClient({
  url: 'ws://localhost:4000/graphql'
});
```

Note that, in browser envirments (and of course having your bundler use the [`browser` package.json field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#browser)), you don't have to import from `graphql-ws/client` - simply importing from `graphql-ws` will only have the `createClient` available.
