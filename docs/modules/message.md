[graphql-ws](../README.md) / message

# Module: message

## Table of contents

### Common Enumerations

- [MessageType](../enums/message.messagetype.md)

### Common Interfaces

- [CompleteMessage](../interfaces/message.completemessage.md)
- [ConnectionAckMessage](../interfaces/message.connectionackmessage.md)
- [ConnectionInitMessage](../interfaces/message.connectioninitmessage.md)
- [ErrorMessage](../interfaces/message.errormessage.md)
- [NextMessage](../interfaces/message.nextmessage.md)
- [SubscribeMessage](../interfaces/message.subscribemessage.md)
- [SubscribePayload](../interfaces/message.subscribepayload.md)

### Common Type aliases

- [Message](message.md#message)

### Common Functions

- [isMessage](message.md#ismessage)
- [parseMessage](message.md#parsemessage)
- [stringifyMessage](message.md#stringifymessage)

## Common Type aliases

### Message

Ƭ **Message**<T\>: T *extends* [*ConnectionAck*](../enums/message.messagetype.md#connectionack) ? [*ConnectionAckMessage*](../interfaces/message.connectionackmessage.md) : T *extends* [*ConnectionInit*](../enums/message.messagetype.md#connectioninit) ? [*ConnectionInitMessage*](../interfaces/message.connectioninitmessage.md) : T *extends* [*Subscribe*](../enums/message.messagetype.md#subscribe) ? [*SubscribeMessage*](../interfaces/message.subscribemessage.md) : T *extends* [*Next*](../enums/message.messagetype.md#next) ? [*NextMessage*](../interfaces/message.nextmessage.md) : T *extends* [*Error*](../enums/message.messagetype.md#error) ? [*ErrorMessage*](../interfaces/message.errormessage.md) : T *extends* [*Complete*](../enums/message.messagetype.md#complete) ? [*CompleteMessage*](../interfaces/message.completemessage.md) : *never*

#### Type parameters:

| Name | Type | Default |
| :------ | :------ | :------ |
| `T` | [*MessageType*](../enums/message.messagetype.md) | [*MessageType*](../enums/message.messagetype.md) |

## Common Functions

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

▸ **parseMessage**(`data`: *unknown*): [*Message*](message.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters:

| Name | Type |
| :------ | :------ |
| `data` | *unknown* |

**Returns:** [*Message*](message.md#message)

___

### stringifyMessage

▸ **stringifyMessage**<T\>(`msg`: [*Message*](message.md#message)<T\>): *string*

Stringifies a valid message ready to be sent through the socket.

#### Type parameters:

| Name | Type |
| :------ | :------ |
| `T` | [*MessageType*](../enums/message.messagetype.md) |

#### Parameters:

| Name | Type |
| :------ | :------ |
| `msg` | [*Message*](message.md#message)<T\> |

**Returns:** *string*
