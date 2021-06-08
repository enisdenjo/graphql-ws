[graphql-ws](../README.md) / use/ws

# Module: use/ws

## Table of contents

### Interfaces

- [Extra](../interfaces/use_ws.extra.md)

### Functions

- [useServer](use_ws.md#useserver)

## Server/ws

### useServer

▸ **useServer**<E\>(`options`, `ws`, `keepAlive?`): [Disposable](../interfaces/common.disposable.md)

Use the server on a [ws](https://github.com/websockets/ws) ws server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | `E`: `Record`<PropertyKey, unknown\> = `Record`<PropertyKey, never\> |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `options` | [ServerOptions](../interfaces/server.serveroptions.md)<[Extra](../interfaces/use_ws.extra.md) & `Partial`<E\>\> | `undefined` |
| `ws` | `WebSocketServer` | `undefined` |
| `keepAlive` | `number` | 12\_000 |

#### Returns

[Disposable](../interfaces/common.disposable.md)
