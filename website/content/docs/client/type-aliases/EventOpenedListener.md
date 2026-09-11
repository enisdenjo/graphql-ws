---
title: "Type Alias: EventOpenedListener() (client)"
sidebarTitle: "EventOpenedListener"
description: "EventOpenedListener (graphql-ws/client): The first argument is actually the WebSocket, but to avoid"
---
> **EventOpenedListener**: (`socket`) => `void`

Defined in: [src/client.ts:112](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L112)

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

## Parameters

### socket

`unknown`

## Returns

`void`
