---
title: "Function: makeServer() (server)"
sidebarTitle: "makeServer"
description: "makeServer (graphql-ws/server): Makes a Protocol compliant WebSocket GraphQL server. The server"
---
> **makeServer**\<`P`, `E`\>(`options`): [`Server`](/docs/server/interfaces/Server)\<`E`\>

Defined in: [src/server.ts:566](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L566)

Makes a Protocol compliant WebSocket GraphQL server. The server
is actually an API which is to be used with your favourite WebSocket
server library!

Read more about the [GraphQL over WebSocket Protocol](https://github.com/graphql/graphql-over-http/blob/main/rfcs/GraphQLOverWebSocket).

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** = `unknown`

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, `E`\>

## Returns

[`Server`](/docs/server/interfaces/Server)\<`E`\>
