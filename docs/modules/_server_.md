[@enisdenjo/graphql-transport-ws](../README.md) › ["server"](_server_.md)

# Module: "server"

## Index

### Interfaces

* [Context](../interfaces/_server_.context.md)
* [Server](../interfaces/_server_.server.md)
* [ServerOptions](../interfaces/_server_.serveroptions.md)

### Functions

* [createServer](_server_.md#createserver)

## Functions

###  createServer

▸ **createServer**(`options`: [ServerOptions](../interfaces/_server_.serveroptions.md), `websocketOptionsOrServer`: WebSocketServerOptions | WebSocketServer): *[Server](../interfaces/_server_.server.md)*

*Defined in [server.ts:171](https://github.com/enisdenjo/graphql-transport-ws/blob/923625c/src/server.ts#L171)*

Creates a protocol complient WebSocket GraphQL
subscription server. Read more about the protocol
in the PROTOCOL.md documentation file.

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ServerOptions](../interfaces/_server_.serveroptions.md) |
`websocketOptionsOrServer` | WebSocketServerOptions &#124; WebSocketServer |

**Returns:** *[Server](../interfaces/_server_.server.md)*
