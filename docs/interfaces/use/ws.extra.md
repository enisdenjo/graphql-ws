[graphql-ws](../../README.md) / [use/ws](../../modules/use_ws.md) / Extra

# Interface: Extra

[use/ws](../../modules/use_ws.md).Extra

The extra that will be put in the `Context`.

## Hierarchy

* **Extra**

## Table of contents

### Properties

- [request](ws.extra.md#request)
- [socket](ws.extra.md#socket)

## Properties

### request

• `Readonly` **request**: *IncomingMessage*

The initial HTTP request before the actual
socket and connection is established.

___

### socket

• `Readonly` **socket**: *WebSocket*

The actual socket connection between the server and the client.
