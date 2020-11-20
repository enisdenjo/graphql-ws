**[graphql-ws](../README.md)**

> [Globals](../README.md) / "server"

# Module: "server"

## Index

### Interfaces

* [Context](../interfaces/_server_.context.md)
* [Server](../interfaces/_server_.server.md)
* [ServerOptions](../interfaces/_server_.serveroptions.md)
* [WebSocket](../interfaces/_server_.websocket.md)

### Type aliases

* [GraphQLExecutionContextValue](_server_.md#graphqlexecutioncontextvalue)
* [OperationResult](_server_.md#operationresult)

### Functions

* [makeServer](_server_.md#makeserver)

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

### makeServer

▸ **makeServer**(`options`: [ServerOptions](../interfaces/_server_.serveroptions.md)): [Server](../interfaces/_server_.server.md)

Makes a Protocol complient WebSocket GraphQL server. The server
is actually an API which is to be used with your favourite WebSocket
server library!

Read more about the Protocol in the PROTOCOL.md documentation file.

#### Parameters:

Name | Type |
------ | ------ |
`options` | [ServerOptions](../interfaces/_server_.serveroptions.md) |

**Returns:** [Server](../interfaces/_server_.server.md)
