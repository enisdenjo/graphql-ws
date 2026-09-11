---
title: "Interface: Extra (use/ws)"
sidebarTitle: "Extra"
description: "Extra (graphql-ws/use/ws): The extra that will be put in the Context."
---
Defined in: [src/use/ws.ts:21](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/ws.ts#L21)

The extra that will be put in the `Context`.

## Properties

### request

> `readonly` **request**: `IncomingMessage`

Defined in: [src/use/ws.ts:30](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/ws.ts#L30)

The initial HTTP upgrade request before the actual
socket and connection is established.

***

### socket

> `readonly` **socket**: `WebSocket`

Defined in: [src/use/ws.ts:25](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/ws.ts#L25)

The actual socket connection between the server and the client.
