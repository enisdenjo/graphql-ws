[graphql-ws](../README.md) / use/fastify-websocket

# Module: use/fastify-websocket

## Table of contents

### Interfaces

- [Extra](../interfaces/use_fastify_websocket.Extra.md)

### Functions

- [makeHandler](use_fastify_websocket.md#makehandler)

## Server/fastify-websocket

### makeHandler

▸ **makeHandler**<`P`, `E`\>(`options`, `keepAlive?`): `fastifyWebsocket.WebsocketHandler`

Make a handler to use on a [fastify-websocket](https://github.com/fastify/fastify-websocket) route.
This is a basic starter, feel free to copy the code over and adjust it to your needs

**`Deprecated`**

Use `@fastify/websocket` instead.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\> = `undefined` \| `Record`<`string`, `unknown`\> |
| `E` | extends `Record`<`PropertyKey`, `unknown`\> = `Record`<`PropertyKey`, `never`\> |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<`P`, [`Extra`](../interfaces/use_fastify_websocket.Extra.md) & `Partial`<`E`\>\> | `undefined` | - |
| `keepAlive` | `number` | `12_000` | The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss)) to check that the link between the clients and the server is operating and to prevent the link from being broken due to idling.  **`Default`**  12_000 // 12 seconds |

#### Returns

`fastifyWebsocket.WebsocketHandler`
