[graphql-ws](../README.md) / use/uWebSockets

# Module: use/uWebSockets

## Table of contents

### Interfaces

- [Extra](../interfaces/use_uwebsockets.extra.md)
- [PersistedRequest](../interfaces/use_uwebsockets.persistedrequest.md)
- [UpgradeData](../interfaces/use_uwebsockets.upgradedata.md)

### Functions

- [makeBehavior](use_uwebsockets.md#makebehavior)

## Server/uWebSockets

### makeBehavior

▸ **makeBehavior**<E\>(`options`: [*ServerOptions*](../interfaces/server.serveroptions.md)<[*Extra*](../interfaces/use_uwebsockets.extra.md) & *Partial*<E\>\>, `behavior?`: uWS.WebSocketBehavior, `keepAlive?`: *number*): uWS.WebSocketBehavior

Make the behaviour for using a [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) WebSocket server.
This is a basic starter, feel free to copy the code over and adjust it to your needs

#### Type parameters

| Name | Type | Default |
| :------ | :------ | :------ |
| `E` | *Record*<PropertyKey, unknown\> | *Record*<PropertyKey, never\> |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `options` | [*ServerOptions*](../interfaces/server.serveroptions.md)<[*Extra*](../interfaces/use_uwebsockets.extra.md) & *Partial*<E\>\> | - |
| `behavior` | uWS.WebSocketBehavior | {} |
| `keepAlive` | *number* | - |

**Returns:** uWS.WebSocketBehavior
