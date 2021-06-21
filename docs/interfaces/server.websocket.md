[graphql-ws](../README.md) / [server](../modules/server.md) / WebSocket

# Interface: WebSocket

[server](../modules/server.md).WebSocket

## Table of contents

### Properties

- [protocol](server.websocket.md#protocol)

### Methods

- [close](server.websocket.md#close)
- [onMessage](server.websocket.md#onmessage)
- [onPing](server.websocket.md#onping)
- [onPong](server.websocket.md#onpong)
- [send](server.websocket.md#send)

## Properties

### protocol

• `Readonly` **protocol**: `string`

The subprotocol of the WebSocket. Will be used
to validate agains the supported ones.

## Methods

### close

▸ **close**(`code`, `reason`): `void` \| `Promise`<void\>

Closes the socket gracefully. Will always provide
the appropriate code and close reason. `onDisconnect`
callback will be called.

The returned promise is used to control the graceful
closure.

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `number` |
| `reason` | `string` |

#### Returns

`void` \| `Promise`<void\>

___

### onMessage

▸ **onMessage**(`cb`): `void`

Called when message is received. The library requires the data
to be a `string`.

All operations requested from the client will block the promise until
completed, this means that the callback will not resolve until all
subscription events have been emitted (or until the client has completed
the stream), or until the query/mutation resolves.

Exceptions raised during any phase of operation processing will
reject the callback's promise, catch them and communicate them
to your clients however you wish.

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`data`: `string`) => `Promise`<void\> |

#### Returns

`void`

___

### onPing

▸ `Optional` **onPing**(`payload`): `void` \| `Promise`<void\>

Implement a listener for the `PingMessage` sent from the client to the server.
If the client sent the ping with a payload, it will be passed through the
first argument.

If this listener is implemented, the server will NOT automatically reply
to any pings from the client. Implementing it makes it your resposibility
to decide how and when to respond.

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `undefined` \| `Record`<string, unknown\> |

#### Returns

`void` \| `Promise`<void\>

___

### onPong

▸ `Optional` **onPong**(`payload`): `void` \| `Promise`<void\>

Implement a listener for the `PongMessage` sent from the client to the server.
If the client sent the pong with a payload, it will be passed through the
first argument.

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `undefined` \| `Record`<string, unknown\> |

#### Returns

`void` \| `Promise`<void\>

___

### send

▸ **send**(`data`): `void` \| `Promise`<void\>

Sends a message through the socket. Will always
provide a `string` message.

Please take care that the send is ready. Meaning,
only provide a truly OPEN socket through the `opened`
method of the `Server`.

The returned promise is used to control the flow of data
(like handling backpressure).

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `string` |

#### Returns

`void` \| `Promise`<void\>
