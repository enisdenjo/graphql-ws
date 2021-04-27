[graphql-ws](../README.md) / use/ws

# Module: use/ws

## Table of contents

### Server/ws Interfaces

- [Extra](../interfaces/use_ws.extra.md)

### Server/ws Functions

- [useServer](use_ws.md#useserver)

## Server/ws Functions

### useServer

▸ **useServer**(`options`: [*ServerOptions*](../interfaces/server.serveroptions.md)<[*Extra*](../interfaces/use_ws.extra.md)\>, `ws`: WebSocketServer, `keepAlive?`: *number*): [*Disposable*](../interfaces/types.disposable.md)

Use the server on a [ws](https://github.com/websockets/ws) ws server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Parameters:

| Name | Type |
| :------ | :------ |
| `options` | [*ServerOptions*](../interfaces/server.serveroptions.md)<[*Extra*](../interfaces/use_ws.extra.md)\> |
| `ws` | WebSocketServer |
| `keepAlive` | *number* |

**Returns:** [*Disposable*](../interfaces/types.disposable.md)
