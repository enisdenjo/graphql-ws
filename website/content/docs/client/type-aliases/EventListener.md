---
title: "Type Alias: EventListener<E> (client)"
sidebarTitle: "EventListener"
description: "EventListener, exported by graphql-ws/client."
---
> **EventListener**\<`E`\>: `E` *extends* [`EventConnecting`](/docs/client/type-aliases/EventConnecting) ? [`EventConnectingListener`](/docs/client/type-aliases/EventConnectingListener) : `E` *extends* [`EventOpened`](/docs/client/type-aliases/EventOpened) ? [`EventOpenedListener`](/docs/client/type-aliases/EventOpenedListener) : `E` *extends* [`EventConnected`](/docs/client/type-aliases/EventConnected) ? [`EventConnectedListener`](/docs/client/type-aliases/EventConnectedListener) : `E` *extends* [`EventPing`](/docs/client/type-aliases/EventPing) ? [`EventPingListener`](/docs/client/type-aliases/EventPingListener) : `E` *extends* [`EventPong`](/docs/client/type-aliases/EventPong) ? [`EventPongListener`](/docs/client/type-aliases/EventPongListener) : `E` *extends* [`EventMessage`](/docs/client/type-aliases/EventMessage) ? [`EventMessageListener`](/docs/client/type-aliases/EventMessageListener) : `E` *extends* [`EventClosed`](/docs/client/type-aliases/EventClosed) ? [`EventClosedListener`](/docs/client/type-aliases/EventClosedListener) : `E` *extends* [`EventError`](/docs/client/type-aliases/EventError) ? [`EventErrorListener`](/docs/client/type-aliases/EventErrorListener) : `never`

Defined in: [src/client.ts:178](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L178)

## Type Parameters

• **E** *extends* [`Event`](/docs/client/type-aliases/Event)
