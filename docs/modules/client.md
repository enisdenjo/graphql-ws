[graphql-ws](../README.md) / client

# Module: client

## Table of contents

### References

- [CompleteMessage](client.md#completemessage)
- [ConnectionAckMessage](client.md#connectionackmessage)
- [ConnectionInitMessage](client.md#connectioninitmessage)
- [Disposable](client.md#disposable)
- [ErrorMessage](client.md#errormessage)
- [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](client.md#graphql_transport_ws_protocol)
- [ID](client.md#id)
- [JSONMessageReplacer](client.md#jsonmessagereplacer)
- [JSONMessageReviver](client.md#jsonmessagereviver)
- [Message](client.md#message)
- [MessageType](client.md#messagetype)
- [NextMessage](client.md#nextmessage)
- [PingMessage](client.md#pingmessage)
- [PongMessage](client.md#pongmessage)
- [Sink](client.md#sink)
- [SubscribeMessage](client.md#subscribemessage)
- [SubscribePayload](client.md#subscribepayload)
- [isMessage](client.md#ismessage)
- [parseMessage](client.md#parsemessage)
- [stringifyMessage](client.md#stringifymessage)

### Interfaces

- [Client](../interfaces/client.client-1.md)
- [ClientOptions](../interfaces/client.clientoptions.md)

### Type aliases

- [Event](client.md#event)
- [EventClosed](client.md#eventclosed)
- [EventClosedListener](client.md#eventclosedlistener)
- [EventConnected](client.md#eventconnected)
- [EventConnectedListener](client.md#eventconnectedlistener)
- [EventConnecting](client.md#eventconnecting)
- [EventConnectingListener](client.md#eventconnectinglistener)
- [EventError](client.md#eventerror)
- [EventErrorListener](client.md#eventerrorlistener)
- [EventListener](client.md#eventlistener)
- [EventMessage](client.md#eventmessage)
- [EventMessageListener](client.md#eventmessagelistener)
- [EventPing](client.md#eventping)
- [EventPingListener](client.md#eventpinglistener)
- [EventPong](client.md#eventpong)
- [EventPongListener](client.md#eventponglistener)

### Functions

- [createClient](client.md#createclient)

## Client

### Event

Ƭ **Event**: [EventConnecting](client.md#eventconnecting) \| [EventConnected](client.md#eventconnected) \| [EventPing](client.md#eventping) \| [EventPong](client.md#eventpong) \| [EventMessage](client.md#eventmessage) \| [EventClosed](client.md#eventclosed) \| [EventError](client.md#eventerror)

___

### EventClosed

Ƭ **EventClosed**: ``"closed"``

___

### EventClosedListener

Ƭ **EventClosedListener**: (`event`: `unknown`) => `void`

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

#### Type declaration

▸ (`event`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `unknown` |

##### Returns

`void`

___

### EventConnected

Ƭ **EventConnected**: ``"connected"``

___

### EventConnectedListener

Ƭ **EventConnectedListener**: (`socket`: `unknown`, `payload?`: `Record`<string, unknown\>) => `void`

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Also, the second argument is the optional payload that the server may
send through the `ConnectionAck` message.

#### Type declaration

▸ (`socket`, `payload?`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `socket` | `unknown` |
| `payload?` | `Record`<string, unknown\> |

##### Returns

`void`

___

### EventConnecting

Ƭ **EventConnecting**: ``"connecting"``

___

### EventConnectingListener

Ƭ **EventConnectingListener**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

___

### EventError

Ƭ **EventError**: ``"error"``

___

### EventErrorListener

Ƭ **EventErrorListener**: (`error`: `unknown`) => `void`

The argument can be either an Error Event or an instance of Error, but to avoid
bundling DOM typings because the client can run in Node env too, you should assert
the type during implementation. Events dispatched from the WebSocket `onerror` can
be handler in this listener.

#### Type declaration

▸ (`error`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `unknown` |

##### Returns

`void`

___

### EventListener

Ƭ **EventListener**<E\>: `E` extends [EventConnecting](client.md#eventconnecting) ? [EventConnectingListener](client.md#eventconnectinglistener) : `E` extends [EventConnected](client.md#eventconnected) ? [EventConnectedListener](client.md#eventconnectedlistener) : `E` extends [EventPing](client.md#eventping) ? [EventPingListener](client.md#eventpinglistener) : `E` extends [EventPong](client.md#eventpong) ? [EventPongListener](client.md#eventponglistener) : `E` extends [EventMessage](client.md#eventmessage) ? [EventMessageListener](client.md#eventmessagelistener) : `E` extends [EventClosed](client.md#eventclosed) ? [EventClosedListener](client.md#eventclosedlistener) : `E` extends [EventError](client.md#eventerror) ? [EventErrorListener](client.md#eventerrorlistener) : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | `E`: [Event](client.md#event) |

___

### EventMessage

Ƭ **EventMessage**: ``"message"``

___

### EventMessageListener

Ƭ **EventMessageListener**: (`message`: [Message](common.md#message)) => `void`

Called for all **valid** messages received by the client. Mainly useful for
debugging and logging received messages.

#### Type declaration

▸ (`message`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [Message](common.md#message) |

##### Returns

`void`

___

### EventPing

Ƭ **EventPing**: ``"ping"``

___

### EventPingListener

Ƭ **EventPingListener**: (`socket`: `unknown`, `received`: `boolean`) => `void`

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Second argument indicates whether the ping was received from the server.
If `false`, then the ping was sent by the client.

#### Type declaration

▸ (`socket`, `received`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `socket` | `unknown` |
| `received` | `boolean` |

##### Returns

`void`

___

### EventPong

Ƭ **EventPong**: ``"pong"``

___

### EventPongListener

Ƭ **EventPongListener**: (`socket`: `unknown`, `received`: `boolean`) => `void`

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Second argument indicates whether the pong was received from the server.
If `false`, then the pong was sent by the client.

#### Type declaration

▸ (`socket`, `received`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `socket` | `unknown` |
| `received` | `boolean` |

##### Returns

`void`

___

### createClient

▸ **createClient**(`options`): [Client](../interfaces/client.client-1.md)

Creates a disposable GraphQL over WebSocket client.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [ClientOptions](../interfaces/client.clientoptions.md) |

#### Returns

[Client](../interfaces/client.client-1.md)

## Other

### CompleteMessage

Re-exports: [CompleteMessage](../interfaces/common.completemessage.md)

___

### ConnectionAckMessage

Re-exports: [ConnectionAckMessage](../interfaces/common.connectionackmessage.md)

___

### ConnectionInitMessage

Re-exports: [ConnectionInitMessage](../interfaces/common.connectioninitmessage.md)

___

### Disposable

Re-exports: [Disposable](../interfaces/common.disposable.md)

___

### ErrorMessage

Re-exports: [ErrorMessage](../interfaces/common.errormessage.md)

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

Re-exports: [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](common.md#graphql_transport_ws_protocol)

___

### ID

Re-exports: [ID](common.md#id)

___

### JSONMessageReplacer

Re-exports: [JSONMessageReplacer](common.md#jsonmessagereplacer)

___

### JSONMessageReviver

Re-exports: [JSONMessageReviver](common.md#jsonmessagereviver)

___

### Message

Re-exports: [Message](common.md#message)

___

### MessageType

Re-exports: [MessageType](../enums/common.messagetype.md)

___

### NextMessage

Re-exports: [NextMessage](../interfaces/common.nextmessage.md)

___

### PingMessage

Re-exports: [PingMessage](../interfaces/common.pingmessage.md)

___

### PongMessage

Re-exports: [PongMessage](../interfaces/common.pongmessage.md)

___

### Sink

Re-exports: [Sink](../interfaces/common.sink.md)

___

### SubscribeMessage

Re-exports: [SubscribeMessage](../interfaces/common.subscribemessage.md)

___

### SubscribePayload

Re-exports: [SubscribePayload](../interfaces/common.subscribepayload.md)

___

### isMessage

Re-exports: [isMessage](common.md#ismessage)

___

### parseMessage

Re-exports: [parseMessage](common.md#parsemessage)

___

### stringifyMessage

Re-exports: [stringifyMessage](common.md#stringifymessage)
