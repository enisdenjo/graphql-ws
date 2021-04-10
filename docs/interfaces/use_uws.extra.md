[graphql-ws](../README.md) / [use/uws](../modules/use_uws.md) / Extra

# Interface: Extra

[use/uws](../modules/use_uws.md).Extra

The extra that will be put in the `Context`.

## Table of contents

### Properties

- [request](use_uws.extra.md#request)
- [socket](use_uws.extra.md#socket)

## Properties

### request

• `Readonly` **request**: HttpRequest

The initial HTTP request before the actual
socket and connection is established.

___

### socket

• `Readonly` **socket**: WebSocket

The actual socket connection between the server and the client.
