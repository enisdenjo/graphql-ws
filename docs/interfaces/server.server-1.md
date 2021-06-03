[graphql-ws](../README.md) / [server](../modules/server.md) / Server

# Interface: Server<E\>

[server](../modules/server.md).Server

## Type parameters

| Name | Type |
| :------ | :------ |
| `E` | `E` = `undefined` |

## Table of contents

### Methods

- [opened](server.server-1.md#opened)

## Methods

### opened

▸ **opened**(`socket`, `ctxExtra`): (`code`: `number`, `reason`: `string`) => `Promise`<void\>

New socket has beeen established. The lib will validate
the protocol and use the socket accordingly. Returned promise
will resolve after the socket closes.

The second argument will be passed in the `extra` field
of the `Context`. You may pass the initial request or the
original WebSocket, if you need it down the road.

Returns a function that should be called when the same socket
has been closed, for whatever reason. The close code and reason
must be passed for reporting to the `onDisconnect` callback. Returned
promise will resolve once the internal cleanup is complete.

#### Parameters

| Name | Type |
| :------ | :------ |
| `socket` | [WebSocket](server.websocket.md) |
| `ctxExtra` | `E` |

#### Returns

`fn`

▸ (`code`, `reason`): `Promise`<void\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `number` |
| `reason` | `string` |

##### Returns

`Promise`<void\>
