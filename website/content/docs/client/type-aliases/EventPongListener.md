---
title: "Type Alias: EventPongListener() (client)"
sidebarTitle: "EventPongListener"
description: "EventPongListener (graphql-ws/client): The first argument communicates whether the pong was received from the server."
---
> **EventPongListener**: (`received`, `payload`) => `void`

Defined in: [src/client.ts:147](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L147)

The first argument communicates whether the pong was received from the server.
If `false`, the pong was sent by the client.

## Parameters

### received

`boolean`

### payload

[`PongMessage`](/docs/common/interfaces/PongMessage)\[`"payload"`\]

## Returns

`void`
