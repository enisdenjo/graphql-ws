graphql-ws

# graphql-ws

## Table of contents

### Enumerations

- [CloseCode](enums/CloseCode.md)
- [MessageType](enums/MessageType.md)

### Interfaces

- [Client](interfaces/Client.md)
- [ClientOptions](interfaces/ClientOptions.md)
- [CompleteMessage](interfaces/CompleteMessage.md)
- [ConnectionAckMessage](interfaces/ConnectionAckMessage.md)
- [ConnectionInitMessage](interfaces/ConnectionInitMessage.md)
- [Context](interfaces/Context.md)
- [Disposable](interfaces/Disposable.md)
- [ErrorMessage](interfaces/ErrorMessage.md)
- [ExecutionPatchResult](interfaces/ExecutionPatchResult.md)
- [ExecutionResult](interfaces/ExecutionResult.md)
- [NextMessage](interfaces/NextMessage.md)
- [PingMessage](interfaces/PingMessage.md)
- [PongMessage](interfaces/PongMessage.md)
- [Server](interfaces/Server.md)
- [ServerOptions](interfaces/ServerOptions.md)
- [Sink](interfaces/Sink.md)
- [SubscribeMessage](interfaces/SubscribeMessage.md)
- [SubscribePayload](interfaces/SubscribePayload.md)
- [WebSocket](interfaces/WebSocket.md)

### Type aliases

- [Event](README.md#event)
- [EventClosed](README.md#eventclosed)
- [EventClosedListener](README.md#eventclosedlistener)
- [EventConnected](README.md#eventconnected)
- [EventConnectedListener](README.md#eventconnectedlistener)
- [EventConnecting](README.md#eventconnecting)
- [EventConnectingListener](README.md#eventconnectinglistener)
- [EventError](README.md#eventerror)
- [EventErrorListener](README.md#eventerrorlistener)
- [EventListener](README.md#eventlistener)
- [EventMessage](README.md#eventmessage)
- [EventMessageListener](README.md#eventmessagelistener)
- [EventOpened](README.md#eventopened)
- [EventOpenedListener](README.md#eventopenedlistener)
- [EventPing](README.md#eventping)
- [EventPingListener](README.md#eventpinglistener)
- [EventPong](README.md#eventpong)
- [EventPongListener](README.md#eventponglistener)
- [GraphQLExecutionContextValue](README.md#graphqlexecutioncontextvalue)
- [ID](README.md#id)
- [JSONMessageReplacer](README.md#jsonmessagereplacer)
- [JSONMessageReviver](README.md#jsonmessagereviver)
- [Message](README.md#message)
- [OperationResult](README.md#operationresult)

### Variables

- [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](README.md#graphql_transport_ws_protocol)

### Functions

- [createClient](README.md#createclient)
- [isMessage](README.md#ismessage)
- [makeServer](README.md#makeserver)
- [parseMessage](README.md#parsemessage)
- [stringifyMessage](README.md#stringifymessage)

## Client

### Event

Ƭ **Event**: [`EventConnecting`](README.md#eventconnecting) \| [`EventOpened`](README.md#eventopened) \| [`EventConnected`](README.md#eventconnected) \| [`EventPing`](README.md#eventping) \| [`EventPong`](README.md#eventpong) \| [`EventMessage`](README.md#eventmessage) \| [`EventClosed`](README.md#eventclosed) \| [`EventError`](README.md#eventerror)

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

Ƭ **EventConnectedListener**: (`socket`: `unknown`, `payload`: [`ConnectionAckMessage`](interfaces/ConnectionAckMessage.md)[``"payload"``]) => `void`

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
| `payload` | [`ConnectionAckMessage`](interfaces/ConnectionAckMessage.md)[``"payload"``] |

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

WebSocket connection had an error.

___

### EventErrorListener

Ƭ **EventErrorListener**: (`error`: `unknown`) => `void`

#### Type declaration

▸ (`error`): `void`

The argument can be either an Error Event or an instance of Error, but to avoid
bundling DOM typings because the client can run in Node env too, you should assert
the type during implementation. Events dispatched from the WebSocket `onerror` can
be handler in this listener.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `unknown` |

##### Returns

`void`

___

### EventListener

Ƭ **EventListener**<`E`\>: `E` extends [`EventConnecting`](README.md#eventconnecting) ? [`EventConnectingListener`](README.md#eventconnectinglistener) : `E` extends [`EventOpened`](README.md#eventopened) ? [`EventOpenedListener`](README.md#eventopenedlistener) : `E` extends [`EventConnected`](README.md#eventconnected) ? [`EventConnectedListener`](README.md#eventconnectedlistener) : `E` extends [`EventPing`](README.md#eventping) ? [`EventPingListener`](README.md#eventpinglistener) : `E` extends [`EventPong`](README.md#eventpong) ? [`EventPongListener`](README.md#eventponglistener) : `E` extends [`EventMessage`](README.md#eventmessage) ? [`EventMessageListener`](README.md#eventmessagelistener) : `E` extends [`EventClosed`](README.md#eventclosed) ? [`EventClosedListener`](README.md#eventclosedlistener) : `E` extends [`EventError`](README.md#eventerror) ? [`EventErrorListener`](README.md#eventerrorlistener) : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends [`Event`](README.md#event) |

___

### EventMessage

Ƭ **EventMessage**: ``"message"``

A message has been received.

___

### EventMessageListener

Ƭ **EventMessageListener**: (`message`: [`Message`](README.md#message)) => `void`

#### Type declaration

▸ (`message`): `void`

Called for all **valid** messages received by the client. Mainly useful for
debugging and logging received messages.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | [`Message`](README.md#message) |

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

Ƭ **EventPingListener**: (`received`: `boolean`, `payload`: [`PingMessage`](interfaces/PingMessage.md)[``"payload"``]) => `void`

#### Type declaration

▸ (`received`, `payload`): `void`

The first argument communicates whether the ping was received from the server.
If `false`, the ping was sent by the client.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `received` | `boolean` |
| `payload` | [`PingMessage`](interfaces/PingMessage.md)[``"payload"``] |

##### Returns

`void`

___

### EventPong

Ƭ **EventPong**: ``"pong"``

`PongMessage` has been received or sent.

___

### EventPongListener

Ƭ **EventPongListener**: (`received`: `boolean`, `payload`: [`PongMessage`](interfaces/PongMessage.md)[``"payload"``]) => `void`

#### Type declaration

▸ (`received`, `payload`): `void`

The first argument communicates whether the pong was received from the server.
If `false`, the pong was sent by the client.

**`category`** Client

##### Parameters

| Name | Type |
| :------ | :------ |
| `received` | `boolean` |
| `payload` | [`PongMessage`](interfaces/PongMessage.md)[``"payload"``] |

##### Returns

`void`

___

### createClient

▸ **createClient**(`options`): [`Client`](interfaces/Client.md)

Creates a disposable GraphQL over WebSocket client.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ClientOptions`](interfaces/ClientOptions.md) |

#### Returns

[`Client`](interfaces/Client.md)

## Common

### ID

Ƭ **ID**: `string`

ID is a string type alias representing
the globally unique ID used for identifying
subscriptions established by the client.

___

### JSONMessageReplacer

Ƭ **JSONMessageReplacer**: (`this`: `any`, `key`: `string`, `value`: `any`) => `any`

#### Type declaration

▸ (`this`, `key`, `value`): `any`

Function that allows customization of the produced JSON string
for the elements of an outgoing `Message` object.

Read more about using it:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter

**`category`** Common

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `any` |
| `key` | `string` |
| `value` | `any` |

##### Returns

`any`

___

### JSONMessageReviver

Ƭ **JSONMessageReviver**: (`this`: `any`, `key`: `string`, `value`: `any`) => `any`

#### Type declaration

▸ (`this`, `key`, `value`): `any`

Function for transforming values within a message during JSON parsing
The values are produced by parsing the incoming raw JSON.

Read more about using it:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#using_the_reviver_parameter

**`category`** Common

##### Parameters

| Name | Type |
| :------ | :------ |
| `this` | `any` |
| `key` | `string` |
| `value` | `any` |

##### Returns

`any`

___

### Message

Ƭ **Message**<`T`\>: `T` extends [`ConnectionAck`](enums/MessageType.md#connectionack) ? [`ConnectionAckMessage`](interfaces/ConnectionAckMessage.md) : `T` extends [`ConnectionInit`](enums/MessageType.md#connectioninit) ? [`ConnectionInitMessage`](interfaces/ConnectionInitMessage.md) : `T` extends [`Ping`](enums/MessageType.md#ping) ? [`PingMessage`](interfaces/PingMessage.md) : `T` extends [`Pong`](enums/MessageType.md#pong) ? [`PongMessage`](interfaces/PongMessage.md) : `T` extends [`Subscribe`](enums/MessageType.md#subscribe) ? [`SubscribeMessage`](interfaces/SubscribeMessage.md) : `T` extends [`Next`](enums/MessageType.md#next) ? [`NextMessage`](interfaces/NextMessage.md) : `T` extends [`Error`](enums/MessageType.md#error) ? [`ErrorMessage`](interfaces/ErrorMessage.md) : `T` extends [`Complete`](enums/MessageType.md#complete) ? [`CompleteMessage`](interfaces/CompleteMessage.md) : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MessageType`](enums/MessageType.md)[`MessageType`](enums/MessageType.md) |

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

• **GRAPHQL\_TRANSPORT\_WS\_PROTOCOL**: ``"graphql-transport-ws"``

The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

___

### isMessage

▸ **isMessage**(`val`): val is ConnectionAckMessage \| PingMessage \| PongMessage \| ConnectionInitMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

Checks if the provided value is a message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `unknown` |

#### Returns

val is ConnectionAckMessage \| PingMessage \| PongMessage \| ConnectionInitMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

___

### parseMessage

▸ **parseMessage**(`data`, `reviver?`): [`Message`](README.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `reviver?` | [`JSONMessageReviver`](README.md#jsonmessagereviver) |

#### Returns

[`Message`](README.md#message)

___

### stringifyMessage

▸ **stringifyMessage**<`T`\>(`msg`, `replacer?`): `string`

Stringifies a valid message ready to be sent through the socket.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MessageType`](enums/MessageType.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`Message`](README.md#message)<`T`\> |
| `replacer?` | [`JSONMessageReplacer`](README.md#jsonmessagereplacer) |

#### Returns

`string`

## Server

### GraphQLExecutionContextValue

Ƭ **GraphQLExecutionContextValue**: `object` \| `symbol` \| `number` \| `string` \| `boolean` \| `undefined` \| ``null``

A concrete GraphQL execution context value type.

Mainly used because TypeScript collapes unions
with `any` or `unknown` to `any` or `unknown`. So,
we use a custom type to allow definitions such as
the `context` server option.

___

### OperationResult

Ƭ **OperationResult**: `Promise`<`AsyncGenerator`<[`ExecutionResult`](interfaces/ExecutionResult.md) \| [`ExecutionPatchResult`](interfaces/ExecutionPatchResult.md)\> \| `AsyncIterable`<[`ExecutionResult`](interfaces/ExecutionResult.md) \| [`ExecutionPatchResult`](interfaces/ExecutionPatchResult.md)\> \| [`ExecutionResult`](interfaces/ExecutionResult.md)\> \| `AsyncGenerator`<[`ExecutionResult`](interfaces/ExecutionResult.md) \| [`ExecutionPatchResult`](interfaces/ExecutionPatchResult.md)\> \| `AsyncIterable`<[`ExecutionResult`](interfaces/ExecutionResult.md) \| [`ExecutionPatchResult`](interfaces/ExecutionPatchResult.md)\> \| [`ExecutionResult`](interfaces/ExecutionResult.md)

___

### makeServer

▸ **makeServer**<`E`\>(`options`): [`Server`](interfaces/Server.md)<`E`\>

Makes a Protocol complient WebSocket GraphQL server. The server
is actually an API which is to be used with your favourite WebSocket
server library!

Read more about the Protocol in the PROTOCOL.md documentation file.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ServerOptions`](interfaces/ServerOptions.md)<`E`\> |

#### Returns

[`Server`](interfaces/Server.md)<`E`\>
