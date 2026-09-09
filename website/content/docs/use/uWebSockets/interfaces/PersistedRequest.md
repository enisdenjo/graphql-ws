---
title: "Interface: PersistedRequest (use/uWebSockets)"
sidebarTitle: "PersistedRequest"
description: "PersistedRequest (graphql-ws/use/uWebSockets): The initial HTTP upgrade request before the actual"
---
Defined in: [src/use/uWebSockets.ts:49](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L49)

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds relevant values extracted from the uWS's request
while it is accessible.

## Properties

### headers

> **headers**: `IncomingHttpHeaders`

Defined in: [src/use/uWebSockets.ts:54](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L54)

***

### method

> **method**: `string`

Defined in: [src/use/uWebSockets.ts:50](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L50)

***

### query

> **query**: `string`

Defined in: [src/use/uWebSockets.ts:53](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L53)

The raw query string (after the `?` sign) or empty string.

***

### url

> **url**: `string`

Defined in: [src/use/uWebSockets.ts:51](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/uWebSockets.ts#L51)
