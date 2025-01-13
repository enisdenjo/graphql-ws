---
'graphql-ws': major
---

Remove deprecated `isMessage`, use `validateMessage` instead

### Migrating from v5 to v6

Replace all ocurrances of `isMessage` with `validateMessage`. Note that `validateMessage` throws if the message is not valid, compared with `isMessage` that simply returned true/false.

```diff
- import { isMessage } from 'graphql-ws';
+ import { validateMessage } from 'graphql-ws';

function isGraphQLWSMessage(val) {
- return isMessage(val);
+ try {
+   validateMessage(val);
+   return true;
+ } catch {
+   return false;
+ }
}
```
