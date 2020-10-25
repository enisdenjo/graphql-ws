**[graphql-ws](../README.md)**

> [Globals](../README.md) / "message"

# Module: "message"

## Index

### Enumerations

* [MessageType](../enums/_message_.messagetype.md)

### Interfaces

* [CompleteMessage](../interfaces/_message_.completemessage.md)
* [ConnectionAckMessage](../interfaces/_message_.connectionackmessage.md)
* [ConnectionInitMessage](../interfaces/_message_.connectioninitmessage.md)
* [ErrorMessage](../interfaces/_message_.errormessage.md)
* [NextMessage](../interfaces/_message_.nextmessage.md)
* [SubscribeMessage](../interfaces/_message_.subscribemessage.md)
* [SubscribePayload](../interfaces/_message_.subscribepayload.md)

### Type aliases

* [Message](_message_.md#message)

### Functions

* [isMessage](_message_.md#ismessage)
* [parseMessage](_message_.md#parsemessage)
* [stringifyMessage](_message_.md#stringifymessage)

## Type aliases

### Message

Ƭ  **Message**\<T>: T *extends* ConnectionAck ? ConnectionAckMessage : T *extends* ConnectionInit ? ConnectionInitMessage : T *extends* Subscribe ? SubscribeMessage : T *extends* Next ? NextMessage : T *extends* Error ? ErrorMessage : T *extends* Complete ? CompleteMessage : never

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`T` | [MessageType](../enums/_message_.messagetype.md) | MessageType |

## Functions

### isMessage

▸ **isMessage**(`val`: unknown): val is Message

Checks if the provided value is a message.

#### Parameters:

Name | Type |
------ | ------ |
`val` | unknown |

**Returns:** val is Message

___

### parseMessage

▸ **parseMessage**(`data`: unknown): [Message](_message_.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters:

Name | Type |
------ | ------ |
`data` | unknown |

**Returns:** [Message](_message_.md#message)

___

### stringifyMessage

▸ **stringifyMessage**\<T>(`msg`: [Message](_message_.md#message)\<T>): string

Stringifies a valid message ready to be sent through the socket.

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [MessageType](../enums/_message_.messagetype.md) |

#### Parameters:

Name | Type |
------ | ------ |
`msg` | [Message](_message_.md#message)\<T> |

**Returns:** string
