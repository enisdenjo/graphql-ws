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
- [Sink](../interfaces/common.sink.md)
- [SubscribeMessage](../interfaces/common.subscribemessage.md)
- [SubscribePayload](../interfaces/common.subscribepayload.md)

### Type aliases

- [ID](common.md#id)
- [Message](common.md#message)

### Variables

- [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](common.md#graphql_transport_ws_protocol)

### Functions

- [isMessage](common.md#ismessage)
- [parseMessage](common.md#parsemessage)
- [stringifyMessage](common.md#stringifymessage)

## Common

### ID

Ƭ **ID**: *string*

ID is a string type alias representing
the globally unique ID used for identifying
subscriptions established by the client.

___

### Message

Ƭ **Message**<T\>: T *extends* [*ConnectionAck*](../enums/common.messagetype.md#connectionack) ? [*ConnectionAckMessage*](../interfaces/common.connectionackmessage.md) : T *extends* [*ConnectionInit*](../enums/common.messagetype.md#connectioninit) ? [*ConnectionInitMessage*](../interfaces/common.connectioninitmessage.md) : T *extends* [*Subscribe*](../enums/common.messagetype.md#subscribe) ? [*SubscribeMessage*](../interfaces/common.subscribemessage.md) : T *extends* [*Next*](../enums/common.messagetype.md#next) ? [*NextMessage*](../interfaces/common.nextmessage.md) : T *extends* [*Error*](../enums/common.messagetype.md#error) ? [*ErrorMessage*](../interfaces/common.errormessage.md) : T *extends* [*Complete*](../enums/common.messagetype.md#complete) ? [*CompleteMessage*](../interfaces/common.completemessage.md) : *never*

#### Type parameters:

| Name | Type | Default |
| :------ | :------ | :------ |
| `T` | [*MessageType*](../enums/common.messagetype.md) | [*MessageType*](../enums/common.messagetype.md) |

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

• `Const` **GRAPHQL\_TRANSPORT\_WS\_PROTOCOL**: ``"graphql-transport-ws"``= 'graphql-transport-ws'

The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

___

### isMessage

▸ **isMessage**(`val`: *unknown*): val is ConnectionInitMessage \| ConnectionAckMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

Checks if the provided value is a message.

#### Parameters:

| Name | Type |
| :------ | :------ |
| `val` | *unknown* |

**Returns:** val is ConnectionInitMessage \| ConnectionAckMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

___

### parseMessage

▸ **parseMessage**(`data`: *unknown*): [*Message*](common.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters:

| Name | Type |
| :------ | :------ |
| `data` | *unknown* |

**Returns:** [*Message*](common.md#message)

___

### stringifyMessage

▸ **stringifyMessage**<T\>(`msg`: [*Message*](common.md#message)<T\>): *string*

Stringifies a valid message ready to be sent through the socket.

#### Type parameters:

| Name | Type |
| :------ | :------ |
| `T` | [*MessageType*](../enums/common.messagetype.md) |

#### Parameters:

| Name | Type |
| :------ | :------ |
| `msg` | [*Message*](common.md#message)<T\> |

**Returns:** *string*
