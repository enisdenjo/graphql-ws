[graphql-ws](../README.md) / use/ws

# Module: use/ws

## Table of contents

### Interfaces

- [Extra](../interfaces/use_ws.Extra.md)

### Functions

- [useServer](use_ws.md#useserver)

## Server/ws

### useServer

▸ **useServer**<`P`, `E`\>(`options`, `ws`, `keepAlive?`): [`Disposable`](../interfaces/common.Disposable.md)

Use the server on a [ws](https://github.com/websockets/ws) ws server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\> = `undefined` \| `Record`<`string`, `unknown`\> |
| `E` | extends `Record`<`PropertyKey`, `unknown`\> = `Record`<`PropertyKey`, `never`\> |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<`P`, [`Extra`](../interfaces/use_ws.Extra.md) & `Partial`<`E`\>\> | `undefined` | - |
| `ws` | `WebSocketServer` | `undefined` | - |
| `keepAlive` | `number` | `12_000` | The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss)) to check that the link between the clients and the server is operating and to prevent the link from being broken due to idling.  **`Default`**  12_000 // 12 seconds |

#### Returns

[`Disposable`](../interfaces/common.Disposable.md)
