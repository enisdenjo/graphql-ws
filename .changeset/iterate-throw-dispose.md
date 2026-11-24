---
'graphql-ws': patch
---

Complete the subscription when calling `throw` on the iterator from `client.iterate`

Calling `throw` ended the iterator but kept the subscription active, so the server kept sending values and the lazy connection stayed open. It now disposes the subscription, as `return` does.
