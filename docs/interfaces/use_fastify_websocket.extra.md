[graphql-ws](../README.md) / [use/fastify-websocket](../modules/use_fastify_websocket.md) / Extra

# Interface: Extra

[use/fastify-websocket](../modules/use_fastify_websocket.md).Extra

The extra that will be put in the `Context`.

## Table of contents

### Properties

- [connection](use_fastify_websocket.extra.md#connection)
- [request](use_fastify_websocket.extra.md#request)

## Properties

### connection

• `Readonly` **connection**: `SocketStream`

The underlying socket connection between the server and the client.
The WebSocket socket is located under the `socket` parameter.

___

### request

• `Readonly` **request**: `FastifyRequest`<RouteGenericInterface, Server, IncomingMessage\>

The initial HTTP upgrade request before the actual
socket and connection is established.
