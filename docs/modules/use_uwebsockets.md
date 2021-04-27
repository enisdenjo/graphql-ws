[graphql-ws](../README.md) / use/uWebSockets

# Module: use/uWebSockets

## Table of contents

### Interfaces

- [Extra](../interfaces/use_uwebsockets.extra.md)

### Functions

- [makeBehavior](use_uwebsockets.md#makebehavior)

## Server/uWebSockets

### makeBehavior

▸ **makeBehavior**(`options`: [*ServerOptions*](../interfaces/server.serveroptions.md)<[*Extra*](../interfaces/use_uwebsockets.extra.md)\>, `behavior?`: uWS.WebSocketBehavior, `keepAlive?`: *number*): uWS.WebSocketBehavior

Make the behaviour for using a [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) WebSocket server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Parameters:

| Name | Type | Default value |
| :------ | :------ | :------ |
| `options` | [*ServerOptions*](../interfaces/server.serveroptions.md)<[*Extra*](../interfaces/use_uwebsockets.extra.md)\> | - |
| `behavior` | uWS.WebSocketBehavior | {} |
| `keepAlive` | *number* | - |

**Returns:** uWS.WebSocketBehavior
