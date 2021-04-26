[graphql-ws](../README.md) / client

# Module: client

## Table of contents

### References

- [CompleteMessage](client.md#completemessage)
- [ConnectionAckMessage](client.md#connectionackmessage)
- [ConnectionInitMessage](client.md#connectioninitmessage)
- [ErrorMessage](client.md#errormessage)
- [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](client.md#graphql_transport_ws_protocol)
- [Message](client.md#message)
- [MessageType](client.md#messagetype)
- [NextMessage](client.md#nextmessage)
- [SubscribeMessage](client.md#subscribemessage)
- [SubscribePayload](client.md#subscribepayload)
- [isMessage](client.md#ismessage)
- [parseMessage](client.md#parsemessage)
- [stringifyMessage](client.md#stringifymessage)

### Client Interfaces

- [Client](../interfaces/client.client-1.md)
- [ClientOptions](../interfaces/client.clientoptions.md)

### Client Type aliases

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

### Client Functions

- [createClient](client.md#createclient)

## References

### CompleteMessage

Re-exports: [CompleteMessage](../interfaces/message.completemessage.md)

___

### ConnectionAckMessage

Re-exports: [ConnectionAckMessage](../interfaces/message.connectionackmessage.md)

___

### ConnectionInitMessage

Re-exports: [ConnectionInitMessage](../interfaces/message.connectioninitmessage.md)

___

### ErrorMessage

Re-exports: [ErrorMessage](../interfaces/message.errormessage.md)

___

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

Re-exports: [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](protocol.md#graphql_transport_ws_protocol)

___

### Message

Re-exports: [Message](message.md#message)

___

### MessageType

Re-exports: [MessageType](../enums/message.messagetype.md)

___

### NextMessage

Re-exports: [NextMessage](../interfaces/message.nextmessage.md)

___

### SubscribeMessage

Re-exports: [SubscribeMessage](../interfaces/message.subscribemessage.md)

___

### SubscribePayload

Re-exports: [SubscribePayload](../interfaces/message.subscribepayload.md)

___

### isMessage

Re-exports: [isMessage](message.md#ismessage)

___

### parseMessage

Re-exports: [parseMessage](message.md#parsemessage)

___

### stringifyMessage

Re-exports: [stringifyMessage](message.md#stringifymessage)

## Client Type aliases

### Event

Ƭ **Event**: [*EventConnecting*](client.md#eventconnecting) \| [*EventConnected*](client.md#eventconnected) \| [*EventMessage*](client.md#eventmessage) \| [*EventClosed*](client.md#eventclosed) \| [*EventError*](client.md#eventerror)

___

### EventClosed

Ƭ **EventClosed**: ``"closed"``

___

### EventClosedListener

Ƭ **EventClosedListener**: (`event`: *unknown*) => *void*

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

#### Type declaration:

▸ (`event`: *unknown*): *void*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `event` | *unknown* |

**Returns:** *void*

___

### EventConnected

Ƭ **EventConnected**: ``"connected"``

___

### EventConnectedListener

Ƭ **EventConnectedListener**: (`socket`: *unknown*, `payload?`: *Record*<string, unknown\>) => *void*

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Also, the second argument is the optional payload that the server may
send through the `ConnectionAck` message.

#### Type declaration:

▸ (`socket`: *unknown*, `payload?`: *Record*<string, unknown\>): *void*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `socket` | *unknown* |
| `payload?` | *Record*<string, unknown\> |

**Returns:** *void*

___

### EventConnecting

Ƭ **EventConnecting**: ``"connecting"``

___

### EventConnectingListener

Ƭ **EventConnectingListener**: () => *void*

#### Type declaration:

▸ (): *void*

**Returns:** *void*

___

### EventError

Ƭ **EventError**: ``"error"``

___

### EventErrorListener

Ƭ **EventErrorListener**: (`error`: *unknown*) => *void*

The argument can be either an Error Event or an instance of Error, but to avoid
bundling DOM typings because the client can run in Node env too, you should assert
the type during implementation. Events dispatched from the WebSocket `onerror` can
be handler in this listener.

#### Type declaration:

▸ (`error`: *unknown*): *void*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `error` | *unknown* |

**Returns:** *void*

___

### EventListener

Ƭ **EventListener**<E\>: E *extends* [*EventConnecting*](client.md#eventconnecting) ? [*EventConnectingListener*](client.md#eventconnectinglistener) : E *extends* [*EventConnected*](client.md#eventconnected) ? [*EventConnectedListener*](client.md#eventconnectedlistener) : E *extends* [*EventMessage*](client.md#eventmessage) ? [*EventMessageListener*](client.md#eventmessagelistener) : E *extends* [*EventClosed*](client.md#eventclosed) ? [*EventClosedListener*](client.md#eventclosedlistener) : E *extends* [*EventError*](client.md#eventerror) ? [*EventErrorListener*](client.md#eventerrorlistener) : *never*

#### Type parameters:

| Name | Type |
| :------ | :------ |
| `E` | [*Event*](client.md#event) |

___

### EventMessage

Ƭ **EventMessage**: ``"message"``

___

### EventMessageListener

Ƭ **EventMessageListener**: (`message`: [*Message*](message.md#message)) => *void*

Called for all **valid** messages received by the client. Mainly useful for
debugging and logging received messages.

#### Type declaration:

▸ (`message`: [*Message*](message.md#message)): *void*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `message` | [*Message*](message.md#message) |

**Returns:** *void*

## Client Functions

### createClient

▸ **createClient**(`options`: [*ClientOptions*](../interfaces/client.clientoptions.md)): [*Client*](../interfaces/client.client-1.md)

Creates a disposable GraphQL over WebSocket client.

#### Parameters:

| Name | Type |
| :------ | :------ |
| `options` | [*ClientOptions*](../interfaces/client.clientoptions.md) |

**Returns:** [*Client*](../interfaces/client.client-1.md)
