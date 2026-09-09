---
title: "Function: handleProtocols() (server)"
sidebarTitle: "handleProtocols"
description: "handleProtocols (graphql-ws/server): Helper utility for choosing the \"graphql-transport-ws\" subprotocol from"
---
> **handleProtocols**(`protocols`): *typeof* [`GRAPHQL_TRANSPORT_WS_PROTOCOL`](/docs/common/variables/GRAPHQL_TRANSPORT_WS_PROTOCOL) \| `false`

Defined in: [src/server.ts:974](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L974)

Helper utility for choosing the "graphql-transport-ws" subprotocol from
a set of WebSocket subprotocols.

Accepts a set of already extracted WebSocket subprotocols or the raw
Sec-WebSocket-Protocol header value. In either case, if the right
protocol appears, it will be returned.

By specification, the server should not provide a value with Sec-WebSocket-Protocol
if it does not agree with client's subprotocols. The client has a responsibility
to handle the connection afterwards.

## Parameters

### protocols

`string` | `string`[] | `Set`\<`string`\>

## Returns

*typeof* [`GRAPHQL_TRANSPORT_WS_PROTOCOL`](/docs/common/variables/GRAPHQL_TRANSPORT_WS_PROTOCOL) \| `false`
