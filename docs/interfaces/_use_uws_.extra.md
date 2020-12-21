**[graphql-ws](../README.md)**

> [Globals](../README.md) / ["use/uws"](../modules/_use_uws_.md) / Extra

# Interface: Extra

The extra that will be put in the `Context`.

## Hierarchy

* **Extra**

## Index

### Properties

* [request](_use_uws_.extra.md#request)
* [socket](_use_uws_.extra.md#socket)

## Properties

### request

• `Readonly` **request**: HttpRequest

The initial HTTP request before the actual
socket and connection is established.

___

### socket

• `Readonly` **socket**: WebSocket

The actual socket connection between the server and the client.
