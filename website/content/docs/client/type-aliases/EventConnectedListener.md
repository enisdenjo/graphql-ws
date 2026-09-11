---
title: "Type Alias: EventConnectedListener() (client)"
sidebarTitle: "EventConnectedListener"
description: "EventConnectedListener (graphql-ws/client): The first argument is actually the WebSocket, but to avoid"
---
> **EventConnectedListener**: (`socket`, `payload`, `wasRetry`) => `void`

Defined in: [src/client.ts:124](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L124)

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Also, the second argument is the optional payload that the server may
send through the `ConnectionAck` message.

## Parameters

### socket

`unknown`

### payload

[`ConnectionAckMessage`](/docs/common/interfaces/ConnectionAckMessage)\[`"payload"`\]

### wasRetry

`boolean`

## Returns

`void`
