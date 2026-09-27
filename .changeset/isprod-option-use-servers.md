---
'graphql-ws': minor
---

Add an `isProd` option to the `ws`, `uWebSockets.js` and `@fastify/websocket` use-server helpers, matching the existing `crossws` option. It controls whether internal error messages are masked with `Internal server error` before reaching the client, defaulting to the `NODE_ENV === 'production'` check as before. This lets apps running in production keep reporting `onConnect` error messages to the client by opting out, or mask eagerly in non-production environments.
