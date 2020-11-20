**[graphql-ws](../README.md)**

> [Globals](../README.md) / ["server"](../modules/_server_.md) / Server

# Interface: Server

## Hierarchy

* **Server**

## Index

### Methods

* [opened](_server_.server.md#opened)

## Methods

### opened

▸ **opened**(`socket`: [WebSocket](_server_.websocket.md)): function

New socket has beeen established. The lib will validate
the protocol and use the socket accordingly. Returned promise
will resolve after the socket closes.

Returns a function that should be called when the same socket
has been closed, for whatever reason. The returned promise will
resolve once the internal cleanup is complete.

#### Parameters:

Name | Type |
------ | ------ |
`socket` | [WebSocket](_server_.websocket.md) |

**Returns:** function
