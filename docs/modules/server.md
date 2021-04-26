[graphql-ws](../README.md) / server

# Module: server

## Table of contents

### Other Interfaces

- [Context](../interfaces/server.context.md)

### Server Interfaces

- [Server](../interfaces/server.server-1.md)
- [ServerOptions](../interfaces/server.serveroptions.md)
- [WebSocket](../interfaces/server.websocket.md)

### Server Type aliases

- [GraphQLExecutionContextValue](server.md#graphqlexecutioncontextvalue)
- [OperationResult](server.md#operationresult)

### Server Functions

- [makeServer](server.md#makeserver)

## Server Type aliases

### GraphQLExecutionContextValue

Ƭ **GraphQLExecutionContextValue**: *object* \| *symbol* \| *number* \| *string* \| *boolean* \| *undefined* \| ``null``

A concrete GraphQL execution context value type.

Mainly used because TypeScript collapes unions
with `any` or `unknown` to `any` or `unknown`. So,
we use a custom type to allow definitions such as
the `context` server option.

___

### OperationResult

Ƭ **OperationResult**: *Promise*<AsyncIterableIterator<ExecutionResult\> \| ExecutionResult\> \| *AsyncIterableIterator*<ExecutionResult\> \| ExecutionResult

## Server Functions

### makeServer

▸ **makeServer**<E\>(`options`: [*ServerOptions*](../interfaces/server.serveroptions.md)<E\>): [*Server*](../interfaces/server.server-1.md)<E\>

Makes a Protocol complient WebSocket GraphQL server. The server
is actually an API which is to be used with your favourite WebSocket
server library!

Read more about the Protocol in the PROTOCOL.md documentation file.

#### Type parameters:

| Name | Default |
| :------ | :------ |
| `E` | *unknown* |

#### Parameters:

| Name | Type |
| :------ | :------ |
| `options` | [*ServerOptions*](../interfaces/server.serveroptions.md)<E\> |

**Returns:** [*Server*](../interfaces/server.server-1.md)<E\>
