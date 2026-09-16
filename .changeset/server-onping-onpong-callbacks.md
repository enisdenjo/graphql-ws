---
'graphql-ws': minor
---

Add `onPing` and `onPong` server callbacks to `ServerOptions`, similar to `onConnect` and `onDisconnect`. The callbacks receive the connection `Context` as the first argument and the ping/pong `payload` as the second, allowing apps to log or react to subprotocol-level pings with access to connection state. The automatic pong reply is preserved when using the server-level `onPing` callback; the low-level websocket `onPing` listener still disables the automatic reply for full manual control.
