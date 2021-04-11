[graphql-ws](../README.md) / [use/uWebSockets](../modules/use_uwebsockets.md) / Extra

# Interface: Extra

[use/uWebSockets](../modules/use_uwebsockets.md).Extra

The extra that will be put in the `Context`.

## Table of contents

### Properties

- [request](use_uwebsockets.extra.md#request)
- [socket](use_uwebsockets.extra.md#socket)

## Properties

### request

• `Readonly` **request**: HttpRequest

The initial HTTP request before the actual
socket and connection is established.

___

### socket

• `Readonly` **socket**: WebSocket

The actual socket connection between the server and the client.
