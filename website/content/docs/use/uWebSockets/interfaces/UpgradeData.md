---
title: "Interface: UpgradeData (use/uWebSockets)"
sidebarTitle: "UpgradeData"
description: "UpgradeData (graphql-ws/use/uWebSockets): Data acquired during the HTTP upgrade callback from uWS."
---
Defined in: [src/use/uWebSockets.ts:25](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L25)

Data acquired during the HTTP upgrade callback from uWS.

## Extended by

- [`Extra`](/docs/use/uWebSockets/interfaces/Extra)

## Properties

### persistedRequest

> `readonly` **persistedRequest**: [`PersistedRequest`](/docs/use/uWebSockets/interfaces/PersistedRequest)

Defined in: [src/use/uWebSockets.ts:35](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L35)

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds the relevant values extracted from the uWS's request
while it is accessible.
