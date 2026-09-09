---
title: "Type Alias: EventPingListener() (client)"
sidebarTitle: "EventPingListener"
description: "EventPingListener (graphql-ws/client): The first argument communicates whether the ping was received from the server."
---
> **EventPingListener**: (`received`, `payload`) => `void`

Defined in: [src/client.ts:136](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L136)

The first argument communicates whether the ping was received from the server.
If `false`, the ping was sent by the client.

## Parameters

### received

`boolean`

### payload

[`PingMessage`](/docs/common/interfaces/PingMessage)\[`"payload"`\]

## Returns

`void`
