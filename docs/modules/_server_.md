**[graphql-ws](../README.md)**

> [Globals](../README.md) / "server"

# Module: "server"

## Index

### Interfaces

* [Context](../interfaces/_server_.context.md)
* [Server](../interfaces/_server_.server.md)
* [ServerOptions](../interfaces/_server_.serveroptions.md)

### Type aliases

* [GraphQLExecutionContextValue](_server_.md#graphqlexecutioncontextvalue)
* [OperationResult](_server_.md#operationresult)

### Functions

* [createServer](_server_.md#createserver)

## Type aliases

### GraphQLExecutionContextValue

Ƭ  **GraphQLExecutionContextValue**: object \| symbol \| number \| string \| boolean \| undefined \| null

A concrete GraphQL execution context value type.

Mainly used because TypeScript collapes unions
with `any` or `unknown` to `any` or `unknown`. So,
we use a custom type to allow definitions such as
the `context` server option.

___

### OperationResult

Ƭ  **OperationResult**: Promise\<AsyncIterableIterator\<ExecutionResult> \| ExecutionResult> \| AsyncIterableIterator\<ExecutionResult> \| ExecutionResult

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
