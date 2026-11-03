---
'graphql-ws': patch
---

Wait for each uWebSockets.js socket's own backpressure to drain, and complete the operations of a socket that closes while backpressured. Sockets used to share one drain callback, so an operation on a backpressured socket could stall until that socket closed
