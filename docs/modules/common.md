[graphql-ws](../README.md) / common

# Module: common

## Table of contents

### Enumerations

- [MessageType](../enums/common.messagetype.md)

### Interfaces

- [CompleteMessage](../interfaces/common.completemessage.md)
- [ConnectionAckMessage](../interfaces/common.connectionackmessage.md)
- [ConnectionInitMessage](../interfaces/common.connectioninitmessage.md)
- [Disposable](../interfaces/common.disposable.md)
- [ErrorMessage](../interfaces/common.errormessage.md)
- [NextMessage](../interfaces/common.nextmessage.md)
- [PingMessage](../interfaces/common.pingmessage.md)
- [PongMessage](../interfaces/common.pongmessage.md)
- [Sink](../interfaces/common.sink.md)
- [SubscribeMessage](../interfaces/common.subscribemessage.md)
- [SubscribePayload](../interfaces/common.subscribepayload.md)

### Type aliases

- [ID](common.md#id)
- [JSONMessageReplacer](common.md#jsonmessagereplacer)
- [JSONMessageReviver](common.md#jsonmessagereviver)
- [Message](common.md#message)

### Variables

- [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](common.md#graphql_transport_ws_protocol)

### Functions

- [isMessage](common.md#ismessage)
- [parseMessage](common.md#parsemessage)
- [stringifyMessage](common.md#stringifymessage)

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

Ƭ **Message**<T\>: `T` extends [ConnectionAck](../enums/common.messagetype.md#connectionack) ? [ConnectionAckMessage](../interfaces/common.connectionackmessage.md) : `T` extends [ConnectionInit](../enums/common.messagetype.md#connectioninit) ? [ConnectionInitMessage](../interfaces/common.connectioninitmessage.md) : `T` extends [Ping](../enums/common.messagetype.md#ping) ? [PingMessage](../interfaces/common.pingmessage.md) : `T` extends [Pong](../enums/common.messagetype.md#pong) ? [PongMessage](../interfaces/common.pongmessage.md) : `T` extends [Subscribe](../enums/common.messagetype.md#subscribe) ? [SubscribeMessage](../interfaces/common.subscribemessage.md) : `T` extends [Next](../enums/common.messagetype.md#next) ? [NextMessage](../interfaces/common.nextmessage.md) : `T` extends [Error](../enums/common.messagetype.md#error) ? [ErrorMessage](../interfaces/common.errormessage.md) : `T` extends [Complete](../enums/common.messagetype.md#complete) ? [CompleteMessage](../interfaces/common.completemessage.md) : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T`: [MessageType](../enums/common.messagetype.md) = [MessageType](../enums/common.messagetype.md) |

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

• `Const` **GRAPHQL\_TRANSPORT\_WS\_PROTOCOL**: ``"graphql-transport-ws"``

The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

___

### isMessage

▸ **isMessage**(`val`): val is PingMessage \| PongMessage \| ConnectionInitMessage \| ConnectionAckMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

Checks if the provided value is a message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `unknown` |

#### Returns

val is PingMessage \| PongMessage \| ConnectionInitMessage \| ConnectionAckMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

___

### parseMessage

▸ **parseMessage**(`data`, `reviver?`): [Message](common.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `reviver?` | [JSONMessageReviver](common.md#jsonmessagereviver) |

#### Returns

[Message](common.md#message)

___

### stringifyMessage

▸ **stringifyMessage**<T\>(`msg`, `replacer?`): `string`

Stringifies a valid message ready to be sent through the socket.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T`: [MessageType](../enums/common.messagetype.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [Message](common.md#message)<T\> |
| `replacer?` | [JSONMessageReplacer](common.md#jsonmessagereplacer) |

#### Returns

`string`
