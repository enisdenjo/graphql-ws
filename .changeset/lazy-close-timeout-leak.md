---
'graphql-ws': patch
---

Fix the client closing an in-use socket when many subscriptions complete at once and a new one subscribes within the `lazyCloseTimeout`

Every completing subscription scheduled its own lazy close timeout, but only the last one got cleared on the next connect. The client now keeps a single lazy close timeout and checks for active subscriptions before closing.
