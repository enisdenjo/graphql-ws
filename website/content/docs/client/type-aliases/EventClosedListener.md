---
title: "Type Alias: EventClosedListener() (client)"
sidebarTitle: "EventClosedListener"
description: "EventClosedListener (graphql-ws/client): The argument is actually the websocket CloseEvent, but to avoid"
---
> **EventClosedListener**: (`event`) => `void`

Defined in: [src/client.ts:167](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L167)

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

## Parameters

### event

`unknown`

## Returns

`void`
