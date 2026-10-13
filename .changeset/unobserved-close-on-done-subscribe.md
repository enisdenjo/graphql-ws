---
'graphql-ws': patch
---

Avoid an unhandled rejection when a subscription is disposed before the connection is acknowledged and the socket closes before the subscription releases its connection lock (for example, when the client is disposed while connecting and the WebSocket implementation delivers the close event on a microtask).
