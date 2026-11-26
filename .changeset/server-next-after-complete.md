---
'graphql-ws': patch
---

The server sends no more `next` of a subscription after the client completes it, also when the source yields once more before it handles the return
