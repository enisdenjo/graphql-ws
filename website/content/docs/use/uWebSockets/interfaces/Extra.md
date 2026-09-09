---
title: "Interface: Extra (use/uWebSockets)"
sidebarTitle: "Extra"
description: "Extra (graphql-ws/use/uWebSockets): The extra that will be put in the Context."
---
Defined in: [src/use/uWebSockets.ts:12](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L12)

The extra that will be put in the `Context`.

## Extends

- [`UpgradeData`](/docs/use/uWebSockets/interfaces/UpgradeData)

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

#### Inherited from

[`UpgradeData`](/docs/use/uWebSockets/interfaces/UpgradeData).[`persistedRequest`](/docs/use/uWebSockets/interfaces/UpgradeData#persistedrequest)

***

### socket

> `readonly` **socket**: `WebSocket`\<`unknown`\> & [`UpgradeData`](/docs/use/uWebSockets/interfaces/UpgradeData)

Defined in: [src/use/uWebSockets.ts:17](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L17)

The actual socket connection between the server and the client
with the upgrade data.
