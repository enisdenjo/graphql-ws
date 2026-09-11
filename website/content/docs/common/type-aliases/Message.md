---
title: "Type Alias: Message<T> (common)"
sidebarTitle: "Message"
description: "Message, exported by graphql-ws/common."
---
> **Message**\<`T`\>: `T` *extends* [`ConnectionAck`](/docs/common/enumerations/MessageType#connectionack) ? [`ConnectionAckMessage`](/docs/common/interfaces/ConnectionAckMessage) : `T` *extends* [`ConnectionInit`](/docs/common/enumerations/MessageType#connectioninit) ? [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage) : `T` *extends* [`Ping`](/docs/common/enumerations/MessageType#ping) ? [`PingMessage`](/docs/common/interfaces/PingMessage) : `T` *extends* [`Pong`](/docs/common/enumerations/MessageType#pong) ? [`PongMessage`](/docs/common/interfaces/PongMessage) : `T` *extends* [`Subscribe`](/docs/common/enumerations/MessageType#subscribe) ? [`SubscribeMessage`](/docs/common/interfaces/SubscribeMessage) : `T` *extends* [`Next`](/docs/common/enumerations/MessageType#next) ? [`NextMessage`](/docs/common/interfaces/NextMessage) : `T` *extends* [`Error`](/docs/common/enumerations/MessageType#error) ? [`ErrorMessage`](/docs/common/interfaces/ErrorMessage) : `T` *extends* [`Complete`](/docs/common/enumerations/MessageType#complete) ? [`CompleteMessage`](/docs/common/interfaces/CompleteMessage) : `never`

Defined in: [src/common.ts:180](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L180)

## Type Parameters

• **T** *extends* [`MessageType`](/docs/common/enumerations/MessageType) = [`MessageType`](/docs/common/enumerations/MessageType)
