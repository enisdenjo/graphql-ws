**[graphql-ws](../README.md)**

> [Globals](../README.md) / "use/ws"

# Module: "use/ws"

## Index

### Functions

* [useServer](_use_ws_.md#useserver)

## Functions

### useServer

▸ **useServer**(`options`: [ServerOptions](../interfaces/_server_.serveroptions.md), `ws`: WebSocketServer, `keepAlive?`: number): [Disposable](../interfaces/_types_.disposable.md)

Use the server on a [ws](https://github.com/websockets/ws) WebSocket server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`options` | [ServerOptions](../interfaces/_server_.serveroptions.md) | - |
`ws` | WebSocketServer | - |
`keepAlive` | number | 12 * 1000 |

**Returns:** [Disposable](../interfaces/_types_.disposable.md)
