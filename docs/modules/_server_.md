**[graphql-transport-ws](../README.md)**

> [Globals](../README.md) / "server"

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

### ExecutionResultFormatter

Ƭ  **ExecutionResultFormatter**: (ctx: [Context](../interfaces/_server_.context.md), result: ExecutionResult) => Promise\<ExecutionResult> \| ExecutionResult

## Functions

### createServer

▸ **createServer**(`options`: [ServerOptions](../interfaces/_server_.serveroptions.md), `websocketOptionsOrServer`: WebSocketServerOptions \| WebSocketServer): [Server](../interfaces/_server_.server.md)

Creates a protocol complient WebSocket GraphQL
subscription server. Read more about the protocol
in the PROTOCOL.md documentation file.

#### Parameters:

Name | Type |
------ | ------ |
`options` | [ServerOptions](../interfaces/_server_.serveroptions.md) |
`websocketOptionsOrServer` | WebSocketServerOptions \| WebSocketServer |

**Returns:** [Server](../interfaces/_server_.server.md)
