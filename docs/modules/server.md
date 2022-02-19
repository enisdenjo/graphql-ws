[graphql-ws](../README.md) / server

# Module: server

## Table of contents

### Interfaces

- [Context](../interfaces/server.Context.md)
- [Server](../interfaces/server.Server.md)
- [ServerOptions](../interfaces/server.ServerOptions.md)
- [WebSocket](../interfaces/server.WebSocket.md)

### Type aliases

- [GraphQLExecutionContextValue](server.md#graphqlexecutioncontextvalue)
- [OperationResult](server.md#operationresult)

### Functions

- [makeServer](server.md#makeserver)

## Server

### GraphQLExecutionContextValue

Ƭ **GraphQLExecutionContextValue**: `object` \| `symbol` \| `number` \| `string` \| `boolean` \| `undefined` \| ``null``

A concrete GraphQL execution context value type.

Mainly used because TypeScript collapes unions
with `any` or `unknown` to `any` or `unknown`. So,
we use a custom type to allow definitions such as
the `context` server option.

___

### OperationResult

Ƭ **OperationResult**: `Promise`<`AsyncGenerator`<[`ExecutionResult`](../interfaces/common.ExecutionResult.md) \| [`ExecutionPatchResult`](../interfaces/common.ExecutionPatchResult.md)\> \| `AsyncIterable`<[`ExecutionResult`](../interfaces/common.ExecutionResult.md) \| [`ExecutionPatchResult`](../interfaces/common.ExecutionPatchResult.md)\> \| [`ExecutionResult`](../interfaces/common.ExecutionResult.md)\> \| `AsyncGenerator`<[`ExecutionResult`](../interfaces/common.ExecutionResult.md) \| [`ExecutionPatchResult`](../interfaces/common.ExecutionPatchResult.md)\> \| `AsyncIterable`<[`ExecutionResult`](../interfaces/common.ExecutionResult.md) \| [`ExecutionPatchResult`](../interfaces/common.ExecutionPatchResult.md)\> \| [`ExecutionResult`](../interfaces/common.ExecutionResult.md)

___

### makeServer

▸ **makeServer**<`P`, `E`\>(`options`): [`Server`](../interfaces/server.Server.md)<`E`\>

Makes a Protocol complient WebSocket GraphQL server. The server
is actually an API which is to be used with your favourite WebSocket
server library!

Read more about the Protocol in the PROTOCOL.md documentation file.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\>`undefined` \| `Record`<`string`, `unknown`\> |
| `E` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<`P`, `E`\> |

#### Returns

[`Server`](../interfaces/server.Server.md)<`E`\>
