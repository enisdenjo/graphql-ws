[graphql-transport-ws](../README.md) › ["server"](_server_.md)

# Module: "server"

## Index

### Interfaces

* [Context](../interfaces/_server_.context.md)
* [Server](../interfaces/_server_.server.md)
* [ServerOptions](../interfaces/_server_.serveroptions.md)

### Type aliases

* [ExecutionResultFormatter](_server_.md#executionresultformatter)

### Functions

* [createServer](_server_.md#createserver)

## Type aliases

###  ExecutionResultFormatter

Ƭ **ExecutionResultFormatter**: *function*

*Defined in [server.ts:40](https://github.com/enisdenjo/graphql-transport-ws/blob/d45c8df/src/server.ts#L40)*

#### Type declaration:

▸ (`ctx`: [Context](../interfaces/_server_.context.md), `result`: ExecutionResult): *Promise‹ExecutionResult› | ExecutionResult*

**Parameters:**

Name | Type |
------ | ------ |
`ctx` | [Context](../interfaces/_server_.context.md) |
`result` | ExecutionResult |

## Functions

###  createServer

▸ **createServer**(`options`: [ServerOptions](../interfaces/_server_.serveroptions.md), `websocketOptionsOrServer`: WebSocketServerOptions | WebSocketServer): *[Server](../interfaces/_server_.server.md)*

*Defined in [server.ts:196](https://github.com/enisdenjo/graphql-transport-ws/blob/d45c8df/src/server.ts#L196)*

Creates a protocol complient WebSocket GraphQL
subscription server. Read more about the protocol
in the PROTOCOL.md documentation file.

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ServerOptions](../interfaces/_server_.serveroptions.md) |
`websocketOptionsOrServer` | WebSocketServerOptions &#124; WebSocketServer |

**Returns:** *[Server](../interfaces/_server_.server.md)*
