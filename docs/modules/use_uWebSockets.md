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

▸ **makeBehavior**<`P`, `E`\>(`options`, `behavior?`, `keepAlive?`): `uWS.WebSocketBehavior`

Make the behaviour for using a [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) WebSocket server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\> = `undefined` \| `Record`<`string`, `unknown`\> |
| `E` | extends `Record`<`PropertyKey`, `unknown`\> = `Record`<`PropertyKey`, `never`\> |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<`P`, [`Extra`](../interfaces/use_uWebSockets.Extra.md) & `Partial`<`E`\>\> | `undefined` | - |
| `behavior` | `WebSocketBehavior` | `{}` | - |
| `keepAlive` | `number` | `12_000` | The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss)) to check that the link between the clients and the server is operating and to prevent the link from being broken due to idling.  **`Default`**  12_000 // 12 seconds |

#### Returns

`uWS.WebSocketBehavior`
