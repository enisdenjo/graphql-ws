---
'graphql-ws': patch
---

Clear the pending `lazyCloseTimeout` when disposing the client

Disposing the client closes the socket but kept the lazy close timeout scheduled, holding on to the disposed client until the timeout fired.
