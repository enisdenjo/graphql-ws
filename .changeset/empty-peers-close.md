---
'graphql-ws': patch
---

Fix the CrossWS adapter ignoring socket closes issued from `server.opened`

`makeHooks` only registered the peer in the clients map after `server.opened` returned, while `send`/`close` no-op'd unless the peer was already in that map. A protocol-mismatch close (and any other close from inside `opened`) was therefore dropped, the WebSocket stayed open, and no `ConnectionAck` was ever sent because the message handler was never installed.
