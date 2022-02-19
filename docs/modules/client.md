[graphql-ws](../README.md) / client

# Module: client

## Table of contents

### References

- [CloseCode](client.md#closecode)
- [CompleteMessage](client.md#completemessage)
- [ConnectionAckMessage](client.md#connectionackmessage)
- [ConnectionInitMessage](client.md#connectioninitmessage)
- [Disposable](client.md#disposable)
- [ErrorMessage](client.md#errormessage)
- [ExecutionPatchResult](client.md#executionpatchresult)
- [ExecutionResult](client.md#executionresult)
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

- [Client](../interfaces/client.Client.md)
- [ClientOptions](../interfaces/client.ClientOptions.md)

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
- [EventOpened](client.md#eventopened)
- [EventOpenedListener](client.md#eventopenedlistener)
- [EventPing](client.md#eventping)
- [EventPingListener](client.md#eventpinglistener)
- [EventPong](client.md#eventpong)
- [EventPongListener](client.md#eventponglistener)

### Functions

- [createClient](client.md#createclient)

## Client

### Event

Ƭ **Event**: [`EventConnecting`](client.md#eventconnecting) \| [`EventOpened`](client.md#eventopened) \| [`EventConnected`](client.md#eventconnected) \| [`EventPing`](client.md#eventping) \| [`EventPong`](client.md#eventpong) \| [`EventMessage`](client.md#eventmessage) \| [`EventClosed`](client.md#eventclosed) \| [`EventError`](client.md#eventerror)

All events that could occur.

___

### EventClosed

Ƭ **EventClosed**: ``"closed"``

WebSocket connection has closed.

___

### EventClosedListener

Ƭ **EventClosedListener**: (`event`: `unknown`) => `void`

#### Type declaration

▸ (`event`): `void`

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `unknown` |

##### Returns

`void`

___

### EventConnected

Ƭ **EventConnected**: ``"connected"``

Open WebSocket connection has been acknowledged.

___

### EventConnectedListener

Ƭ **EventConnectedListener**: (`socket`: `unknown`, `payload`: [`ConnectionAckMessage`](../interfaces/common.ConnectionAckMessage.md)[``"payload"``]) => `void`

#### Type declaration

▸ (`socket`, `payload`): `void`

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Also, the second argument is the optional payload that the server may
send through the `ConnectionAck` message.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `socket` | `unknown` |
| `payload` | [`ConnectionAckMessage`](../interfaces/common.ConnectionAckMessage.md)[``"payload"``] |

##### Returns

`void`

___

### EventConnecting

Ƭ **EventConnecting**: ``"connecting"``

WebSocket started connecting.

___

### EventConnectingListener

Ƭ **EventConnectingListener**: () => `void`

#### Type declaration

▸ (): `void`

**`category`** Client

##### Returns

`void`

___

### EventError

Ƭ **EventError**: ``"error"``

WebSocket connection had an error or client had an internal error.

___

### EventErrorListener

Ƭ **EventErrorListener**: (`error`: `unknown`) => `void`

#### Type declaration

▸ (`error`): `void`

Events dispatched from the WebSocket `onerror` are handled in this listener,
as well as all internal client errors that could throw.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `unknown` |

##### Returns

`void`

___

### EventListener

Ƭ **EventListener**<`E`\>: `E` extends [`EventConnecting`](client.md#eventconnecting) ? [`EventConnectingListener`](client.md#eventconnectinglistener) : `E` extends [`EventOpened`](client.md#eventopened) ? [`EventOpenedListener`](client.md#eventopenedlistener) : `E` extends [`EventConnected`](client.md#eventconnected) ? [`EventConnectedListener`](client.md#eventconnectedlistener) : `E` extends [`EventPing`](client.md#eventping) ? [`EventPingListener`](client.md#eventpinglistener) : `E` extends [`EventPong`](client.md#eventpong) ? [`EventPongListener`](client.md#eventponglistener) : `E` extends [`EventMessage`](client.md#eventmessage) ? [`EventMessageListener`](client.md#eventmessagelistener) : `E` extends [`EventClosed`](client.md#eventclosed) ? [`EventClosedListener`](client.md#eventclosedlistener) : `E` extends [`EventError`](client.md#eventerror) ? [`EventErrorListener`](client.md#eventerrorlistener) : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends [`Event`](client.md#event) |

___

### EventMessage

Ƭ **EventMessage**: ``"message"``

A message has been received.

___

### EventMessageListener

Ƭ **EventMessageListener**: (`message`: [`Message`](common.md#message)) => `void`

#### Type declaration

▸ (`message`): `void`

Called for all **valid** messages received by the client. Mainly useful for
debugging and logging received messages.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`Message`](common.md#message) |

##### Returns

`void`

___

### EventOpened

Ƭ **EventOpened**: ``"opened"``

WebSocket has opened.

___

### EventOpenedListener

Ƭ **EventOpenedListener**: (`socket`: `unknown`) => `void`

#### Type declaration

▸ (`socket`): `void`

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `socket` | `unknown` |

##### Returns

`void`

___

### EventPing

Ƭ **EventPing**: ``"ping"``

`PingMessage` has been received or sent.

___

### EventPingListener

Ƭ **EventPingListener**: (`received`: `boolean`, `payload`: [`PingMessage`](../interfaces/common.PingMessage.md)[``"payload"``]) => `void`

#### Type declaration

▸ (`received`, `payload`): `void`

The first argument communicates whether the ping was received from the server.
If `false`, the ping was sent by the client.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `received` | `boolean` |
| `payload` | [`PingMessage`](../interfaces/common.PingMessage.md)[``"payload"``] |

##### Returns

`void`

___

### EventPong

Ƭ **EventPong**: ``"pong"``

`PongMessage` has been received or sent.

___

### EventPongListener

Ƭ **EventPongListener**: (`received`: `boolean`, `payload`: [`PongMessage`](../interfaces/common.PongMessage.md)[``"payload"``]) => `void`

#### Type declaration

▸ (`received`, `payload`): `void`

The first argument communicates whether the pong was received from the server.
If `false`, the pong was sent by the client.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `received` | `boolean` |
| `payload` | [`PongMessage`](../interfaces/common.PongMessage.md)[``"payload"``] |

##### Returns

`void`

___

### createClient

▸ **createClient**<`P`\>(`options`): [`Client`](../interfaces/client.Client.md)

Creates a disposable GraphQL over WebSocket client.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends `undefined` \| `Record`<`string`, `unknown`\>`undefined` \| `Record`<`string`, `unknown`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ClientOptions`](../interfaces/client.ClientOptions.md)<`P`\> |

#### Returns

[`Client`](../interfaces/client.Client.md)

## Other

### CloseCode

Re-exports [CloseCode](../enums/common.CloseCode.md)

___

### CompleteMessage

Re-exports [CompleteMessage](../interfaces/common.CompleteMessage.md)

___

### ConnectionAckMessage

Re-exports [ConnectionAckMessage](../interfaces/common.ConnectionAckMessage.md)

___

### ConnectionInitMessage

Re-exports [ConnectionInitMessage](../interfaces/common.ConnectionInitMessage.md)

___

### Disposable

Re-exports [Disposable](../interfaces/common.Disposable.md)

___

### ErrorMessage

Re-exports [ErrorMessage](../interfaces/common.ErrorMessage.md)

___

### ExecutionPatchResult

Re-exports [ExecutionPatchResult](../interfaces/common.ExecutionPatchResult.md)

___

### ExecutionResult

Re-exports [ExecutionResult](../interfaces/common.ExecutionResult.md)

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

Re-exports [GRAPHQL_TRANSPORT_WS_PROTOCOL](common.md#graphql_transport_ws_protocol)

___

### ID

Re-exports [ID](common.md#id)

___

### JSONMessageReplacer

Re-exports [JSONMessageReplacer](common.md#jsonmessagereplacer)

___

### JSONMessageReviver

Re-exports [JSONMessageReviver](common.md#jsonmessagereviver)

___

### Message

Re-exports [Message](common.md#message)

___

### MessageType

Re-exports [MessageType](../enums/common.MessageType.md)

___

### NextMessage

Re-exports [NextMessage](../interfaces/common.NextMessage.md)

___

### PingMessage

Re-exports [PingMessage](../interfaces/common.PingMessage.md)

___

### PongMessage

Re-exports [PongMessage](../interfaces/common.PongMessage.md)

___

### Sink

Re-exports [Sink](../interfaces/common.Sink.md)

___

### SubscribeMessage

Re-exports [SubscribeMessage](../interfaces/common.SubscribeMessage.md)

___

### SubscribePayload

Re-exports [SubscribePayload](../interfaces/common.SubscribePayload.md)

___

### isMessage

Re-exports [isMessage](common.md#ismessage)

___

### parseMessage

Re-exports [parseMessage](common.md#parsemessage)

___

### stringifyMessage

Re-exports [stringifyMessage](common.md#stringifymessage)
