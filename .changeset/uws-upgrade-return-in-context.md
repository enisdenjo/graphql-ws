---
'graphql-ws': minor
---

The `uWebSockets.js` use-server behaviour's `upgrade` callback may now return an object, which is merged into the upgrade data and made available on the socket and in the context extra (typed by `makeBehavior`'s `E` generic). Data acquired during the upgrade, like the client's address, can thereby reach the connection - previously the callback's return value was discarded.
