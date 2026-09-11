---
title: "Enumeration: CloseCode (common)"
sidebarTitle: "CloseCode"
description: "CloseCode (graphql-ws/common): Subscriber distinction is very important"
---
Defined in: [src/common.ts:29](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L29)

`graphql-ws` expected and standard close codes of the [GraphQL over WebSocket Protocol](https://github.com/graphql/graphql-over-http/blob/main/rfcs/GraphQLOverWebSocket).

## Enumeration Members

### BadRequest

> **BadRequest**: `4400`

Defined in: [src/common.ts:32](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L32)

***

### BadResponse

> **BadResponse**: `4004`

Defined in: [src/common.ts:33](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L33)

***

### ConnectionAcknowledgementTimeout

> **ConnectionAcknowledgementTimeout**: `4504`

Defined in: [src/common.ts:39](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L39)

***

### ConnectionInitialisationTimeout

> **ConnectionInitialisationTimeout**: `4408`

Defined in: [src/common.ts:38](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L38)

***

### Forbidden

> **Forbidden**: `4403`

Defined in: [src/common.ts:36](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L36)

***

### InternalClientError

> **InternalClientError**: `4005`

Defined in: [src/common.ts:31](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L31)

***

### InternalServerError

> **InternalServerError**: `4500`

Defined in: [src/common.ts:30](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L30)

***

### SubprotocolNotAcceptable

> **SubprotocolNotAcceptable**: `4406`

Defined in: [src/common.ts:37](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L37)

***

### SubscriberAlreadyExists

> **SubscriberAlreadyExists**: `4409`

Defined in: [src/common.ts:41](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L41)

Subscriber distinction is very important

***

### TooManyInitialisationRequests

> **TooManyInitialisationRequests**: `4429`

Defined in: [src/common.ts:42](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L42)

***

### Unauthorized

> **Unauthorized**: `4401`

Defined in: [src/common.ts:35](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L35)

Tried subscribing before connect ack
