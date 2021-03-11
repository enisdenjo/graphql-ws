[graphql-ws](../README.md) / client

# Module: client

## Table of contents

### Enumerations

- [MessageType](../enums/client.messagetype.md)

### Interfaces

- [Client](../interfaces/client.client-1.md)
- [ClientOptions](../interfaces/client.clientoptions.md)
- [CompleteMessage](../interfaces/client.completemessage.md)
- [ConnectionAckMessage](../interfaces/client.connectionackmessage.md)
- [ConnectionInitMessage](../interfaces/client.connectioninitmessage.md)
- [ErrorMessage](../interfaces/client.errormessage.md)
- [NextMessage](../interfaces/client.nextmessage.md)
- [SubscribeMessage](../interfaces/client.subscribemessage.md)
- [SubscribePayload](../interfaces/client.subscribepayload.md)

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
- [Message](client.md#message)

### Variables

- [GRAPHQL\_TRANSPORT\_WS\_PROTOCOL](client.md#graphql_transport_ws_protocol)

### Functions

- [createClient](client.md#createclient)
- [isMessage](client.md#ismessage)
- [parseMessage](client.md#parsemessage)
- [stringifyMessage](client.md#stringifymessage)

## Type aliases

### Event

Ƭ **Event**: [*EventConnecting*](client.md#eventconnecting) \| [*EventConnected*](client.md#eventconnected) \| [*EventClosed*](client.md#eventclosed) \| [*EventError*](client.md#eventerror)

___

### EventClosed

Ƭ **EventClosed**: *closed*

___

### EventClosedListener

Ƭ **EventClosedListener**: (`event`: *unknown*) => *void*

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

#### Type declaration:

▸ (`event`: *unknown*): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`event` | *unknown* |

**Returns:** *void*

___

### EventConnected

Ƭ **EventConnected**: *connected*

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

Name | Type |
:------ | :------ |
`socket` | *unknown* |
`payload?` | *Record*<string, unknown\> |

**Returns:** *void*

___

### EventConnecting

Ƭ **EventConnecting**: *connecting*

___

### EventConnectingListener

Ƭ **EventConnectingListener**: () => *void*

#### Type declaration:

▸ (): *void*

**Returns:** *void*

___

### EventError

Ƭ **EventError**: *error*

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

Name | Type |
:------ | :------ |
`error` | *unknown* |

**Returns:** *void*

___

### EventListener

Ƭ **EventListener**<E\>: E *extends* [*EventConnecting*](client.md#eventconnecting) ? [*EventConnectingListener*](client.md#eventconnectinglistener) : E *extends* [*EventConnected*](client.md#eventconnected) ? [*EventConnectedListener*](client.md#eventconnectedlistener) : E *extends* [*EventClosed*](client.md#eventclosed) ? [*EventClosedListener*](client.md#eventclosedlistener) : E *extends* [*EventError*](client.md#eventerror) ? [*EventErrorListener*](client.md#eventerrorlistener) : *never*

#### Type parameters:

Name | Type |
:------ | :------ |
`E` | [*Event*](client.md#event) |

___

### Message

Ƭ **Message**<T\>: T *extends* [*ConnectionAck*](../enums/message.messagetype.md#connectionack) ? [*ConnectionAckMessage*](../interfaces/message.connectionackmessage.md) : T *extends* [*ConnectionInit*](../enums/message.messagetype.md#connectioninit) ? [*ConnectionInitMessage*](../interfaces/message.connectioninitmessage.md) : T *extends* [*Subscribe*](../enums/message.messagetype.md#subscribe) ? [*SubscribeMessage*](../interfaces/message.subscribemessage.md) : T *extends* [*Next*](../enums/message.messagetype.md#next) ? [*NextMessage*](../interfaces/message.nextmessage.md) : T *extends* [*Error*](../enums/message.messagetype.md#error) ? [*ErrorMessage*](../interfaces/message.errormessage.md) : T *extends* [*Complete*](../enums/message.messagetype.md#complete) ? [*CompleteMessage*](../interfaces/message.completemessage.md) : *never*

#### Type parameters:

Name | Type | Default |
:------ | :------ | :------ |
`T` | [*MessageType*](../enums/message.messagetype.md) | [*MessageType*](../enums/message.messagetype.md) |

## Variables

### GRAPHQL\_TRANSPORT\_WS\_PROTOCOL

• `Const` **GRAPHQL\_TRANSPORT\_WS\_PROTOCOL**: *graphql-transport-ws*= 'graphql-transport-ws'

The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

## Functions

### createClient

▸ **createClient**(`options`: [*ClientOptions*](../interfaces/client.clientoptions.md)): [*Client*](../interfaces/client.client-1.md)

Creates a disposable GraphQL over WebSocket client.

#### Parameters:

Name | Type |
:------ | :------ |
`options` | [*ClientOptions*](../interfaces/client.clientoptions.md) |

**Returns:** [*Client*](../interfaces/client.client-1.md)

___

### isMessage

▸ **isMessage**(`val`: *unknown*): val is ConnectionInitMessage \| ConnectionAckMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

Checks if the provided value is a message.

#### Parameters:

Name | Type |
:------ | :------ |
`val` | *unknown* |

**Returns:** val is ConnectionInitMessage \| ConnectionAckMessage \| SubscribeMessage \| NextMessage \| ErrorMessage \| CompleteMessage

___

### parseMessage

▸ **parseMessage**(`data`: *unknown*): [*Message*](message.md#message)

Parses the raw websocket message data to a valid message.

#### Parameters:

Name | Type |
:------ | :------ |
`data` | *unknown* |

**Returns:** [*Message*](message.md#message)

___

### stringifyMessage

▸ **stringifyMessage**<T\>(`msg`: [*Message*](message.md#message)<T\>): *string*

Stringifies a valid message ready to be sent through the socket.

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | [*MessageType*](../enums/message.messagetype.md) |

#### Parameters:

Name | Type |
:------ | :------ |
`msg` | [*Message*](message.md#message)<T\> |

**Returns:** *string*
