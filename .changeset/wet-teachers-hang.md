---
'graphql-ws': major
---

Removed deprecated `isFatalConnectionProblem`, use `shouldRetry` instead

### Migrating from v5 to v6

Replace all ocurrances of `isFatalConnectionProblem` with `shouldRetry`. Note that the result is inverted, where you returned `false` in `isFatalConnectionProblem` you should return `true` in `shouldRetry`.

```diff
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:4000/graphql',
- isFatalConnectionProblem: () => false,
+ shouldRetry: () => true,
});
```
