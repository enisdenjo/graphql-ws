[graphql-ws](../README.md) / use/uWebSockets

# Module: use/uWebSockets

## Table of contents

### Interfaces

- [Extra](../interfaces/use_uWebSockets.Extra.md)
- [PersistedRequest](../interfaces/use_uWebSockets.PersistedRequest.md)
- [UpgradeData](../interfaces/use_uWebSockets.UpgradeData.md)

### Functions

- [makeBehavior](use_uWebSockets.md#makebehavior)

## Server/uWebSockets

### makeBehavior

▸ **makeBehavior**<`E`\>(`options`, `behavior?`, `keepAlive?`): `uWS.WebSocketBehavior`

Make the behaviour for using a [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) WebSocket server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `Record`<`PropertyKey`, `unknown`\>`Record`<`PropertyKey`, `never`\> |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<[`Extra`](../interfaces/use_uWebSockets.Extra.md) & `Partial`<`E`\>\> | `undefined` |
| `behavior` | `WebSocketBehavior` | `{}` |
| `keepAlive` | `number` | `12_000` |

#### Returns

`uWS.WebSocketBehavior`
