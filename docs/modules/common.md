[graphql-ws](../README.md) / common

# Module: common

## Table of contents

### Enumerations

- [CloseCode](../enums/common.CloseCode.md)
- [MessageType](../enums/common.MessageType.md)

### Interfaces

- [CompleteMessage](../interfaces/common.CompleteMessage.md)
- [ConnectionAckMessage](../interfaces/common.ConnectionAckMessage.md)
- [ConnectionInitMessage](../interfaces/common.ConnectionInitMessage.md)
- [Disposable](../interfaces/common.Disposable.md)
- [ErrorMessage](../interfaces/common.ErrorMessage.md)
- [ExecutionPatchResult](../interfaces/common.ExecutionPatchResult.md)
- [ExecutionResult](../interfaces/common.ExecutionResult.md)
- [NextMessage](../interfaces/common.NextMessage.md)
- [PingMessage](../interfaces/common.PingMessage.md)
- [PongMessage](../interfaces/common.PongMessage.md)
- [Sink](../interfaces/common.Sink.md)
- [SubscribeMessage](../interfaces/common.SubscribeMessage.md)
- [SubscribePayload](../interfaces/common.SubscribePayload.md)

### Type Aliases

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
- [validateMessage](common.md#validatemessage)

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

Ƭ **Message**<`T`\>: `T` extends [`ConnectionAck`](../enums/common.MessageType.md#connectionack) ? [`ConnectionAckMessage`](../interfaces/common.ConnectionAckMessage.md) : `T` extends [`ConnectionInit`](../enums/common.MessageType.md#connectioninit) ? [`ConnectionInitMessage`](../interfaces/common.ConnectionInitMessage.md) : `T` extends [`Ping`](../enums/common.MessageType.md#ping) ? [`PingMessage`](../interfaces/common.PingMessage.md) : `T` extends [`Pong`](../enums/common.MessageType.md#pong) ? [`PongMessage`](../interfaces/common.PongMessage.md) : `T` extends [`Subscribe`](../enums/common.MessageType.md#subscribe) ? [`SubscribeMessage`](../interfaces/common.SubscribeMessage.md) : `T` extends [`Next`](../enums/common.MessageType.md#next) ? [`NextMessage`](../interfaces/common.NextMessage.md) : `T` extends [`Error`](../enums/common.MessageType.md#error) ? [`ErrorMessage`](../interfaces/common.ErrorMessage.md) : `T` extends [`Complete`](../enums/common.MessageType.md#complete) ? [`CompleteMessage`](../interfaces/common.CompleteMessage.md) : `never`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MessageType`](../enums/common.MessageType.md) = [`MessageType`](../enums/common.MessageType.md) |

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

• `Const` **GRAPHQL\_TRANSPORT\_WS\_PROTOCOL**: ``"graphql-transport-ws"``

The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

___

### isMessage

▸ **isMessage**(`val`): val is ConnectionInitMessage \| ConnectionAckMessage \| PingMessage \| PongMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

Checks if the provided value is a valid GraphQL over WebSocket message.

**`Deprecated`**

 Use `validateMessage` instead.

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `unknown` |

#### Returns

val is ConnectionInitMessage \| ConnectionAckMessage \| PingMessage \| PongMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

___

### parseMessage

▸ **parseMessage**(`data`, `reviver?`): [`Message`](common.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `reviver?` | [`JSONMessageReviver`](common.md#jsonmessagereviver) |

#### Returns

[`Message`](common.md#message)

___

### stringifyMessage

▸ **stringifyMessage**<`T`\>(`msg`, `replacer?`): `string`

Stringifies a valid message ready to be sent through the socket.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`MessageType`](../enums/common.MessageType.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [`Message`](common.md#message)<`T`\> |
| `replacer?` | [`JSONMessageReplacer`](common.md#jsonmessagereplacer) |

#### Returns

`string`

___

### validateMessage

▸ **validateMessage**(`val`): [`Message`](common.md#message)

Validates the message against the GraphQL over WebSocket Protocol.

Invalid messages will throw descriptive errors.

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `unknown` |

#### Returns

[`Message`](common.md#message)
