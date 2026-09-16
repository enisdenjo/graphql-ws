---
'graphql-ws': patch
---

Support crossws 0.4 by selecting the GraphQL WebSocket subprotocol during the upgrade handshake. Preserve automatic protocol negotiation in the legacy crossws 0.3 Node and uWebSockets adapters.
