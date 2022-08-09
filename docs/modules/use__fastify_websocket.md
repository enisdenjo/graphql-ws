[graphql-ws](../README.md) / use/@fastify/websocket

# Module: use/@fastify/websocket

## Table of contents

### Interfaces

- [Extra](../interfaces/use__fastify_websocket.Extra.md)

### Functions

- [makeHandler](use__fastify_websocket.md#makehandler)

## Server/@fastify/websocket

### makeHandler

▸ **makeHandler**<`P`, `E`\>(`options`, `keepAlive?`): `fastifyWebsocket.WebsocketHandler`

Make a handler to use on a [@fastify/websocket](https://github.com/fastify/fastify-websocket) route.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\> = `undefined` \| `Record`<`string`, `unknown`\> |
| `E` | extends `Record`<`PropertyKey`, `unknown`\> = `Record`<`PropertyKey`, `never`\> |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `options` | [`ServerOptions`](../interfaces/server.ServerOptions.md)<`P`, [`Extra`](../interfaces/use__fastify_websocket.Extra.md) & `Partial`<`E`\>\> | `undefined` |
| `keepAlive` | `number` | `12_000` |

#### Returns

`fastifyWebsocket.WebsocketHandler`
