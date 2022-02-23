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

- [handleProtocols](server.md#handleprotocols)
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

### handleProtocols

▸ **handleProtocols**(`protocols`): typeof [`GRAPHQL_TRANSPORT_WS_PROTOCOL`](common.md#graphql_transport_ws_protocol) \| ``false``

Helper utility for choosing the "graphql-transport-ws" subprotocol from
a set of WebSocket subprotocols.

Accepts a set of already extracted WebSocket subprotocols or the raw
Sec-WebSocket-Protocol header value. In either case, if the right
protocol appears, it will be returned.

By specification, the server should not provide a value with Sec-WebSocket-Protocol
if it does not agree with client's subprotocols. The client has a responsibility
to handle the connection afterwards.

#### Parameters

| Name | Type |
| :------ | :------ |
| `protocols` | `string` \| `Set`<`string`\> \| `string`[] |

#### Returns

typeof [`GRAPHQL_TRANSPORT_WS_PROTOCOL`](common.md#graphql_transport_ws_protocol) \| ``false``

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
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\> = `undefined` \| `Record`<`string`, `unknown`\> |
| `E` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<`P`, `E`\> |

#### Returns

[`Server`](../interfaces/server.Server.md)<`E`\>
