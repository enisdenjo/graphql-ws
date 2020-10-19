**[graphql-transport-ws](../README.md)**

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

## Type aliases

### Message

Ƭ  **Message**\<T>: T *extends* ConnectionAck ? ConnectionAckMessage : T *extends* ConnectionInit ? ConnectionInitMessage : T *extends* Subscribe ? SubscribeMessage : T *extends* Next ? NextMessage : T *extends* Error ? ErrorMessage : T *extends* Complete ? CompleteMessage : never

*Defined in [message.ts:65](https://github.com/enisdenjo/graphql-transport-ws/blob/624b4ce/src/message.ts#L65)*

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`T` | [MessageType](../enums/_message_.messagetype.md) | MessageType |
