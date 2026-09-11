---
title: "Interface: Extra (use/@fastify/websocket)"
sidebarTitle: "Extra"
description: "Extra (graphql-ws/use/@fastify/websocket): The extra that will be put in the Context."
---
Defined in: [src/use/@fastify/websocket.ts:16](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/@fastify/websocket.ts#L16)

The extra that will be put in the `Context`.

## Properties

### request

> `readonly` **request**: `FastifyRequest`\<`IncomingMessage`, `ResolveFastifyRequestType`\<`FastifyTypeProviderDefault`, `FastifySchema`, `RouteGenericInterface`\>\>

Defined in: [src/use/@fastify/websocket.ts:26](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/@fastify/websocket.ts#L26)

The initial HTTP upgrade request before the actual
socket and connection is established.

***

### socket

> `readonly` **socket**: `WebSocket`

Defined in: [src/use/@fastify/websocket.ts:21](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/@fastify/websocket.ts#L21)

The underlying socket connection between the server and the client.
The WebSocket socket is located under the `socket` parameter.
