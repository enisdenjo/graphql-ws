---
'graphql-ws': patch
---

The client gives the sink no `next` after the operation is done, also when the `next` comes in the same read as the `complete` of the server
