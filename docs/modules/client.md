[graphql-ws](../README.md) / client

# Module: client

## Table of contents

### Interfaces

- [Client](../interfaces/client.client-1.md)
- [ClientOptions](../interfaces/client.clientoptions.md)

### Type aliases

- [Event](client.md#event)
- [EventClosed](client.md#eventclosed)
- [EventClosedListener](client.md#eventclosedlistener)
- [EventConnected](client.md#eventconnected)
- [EventConnectedListener](client.md#eventconnectedlistener)
- [EventConnecting](client.md#eventconnecting)
- [EventConnectingListener](client.md#eventconnectinglistener)
- [EventListener](client.md#eventlistener)

### Functions

- [createClient](client.md#createclient)

## Type aliases

### Event

Ƭ **Event**: [*EventConnecting*](client.md#eventconnecting) \| [*EventConnected*](client.md#eventconnected) \| [*EventClosed*](client.md#eventclosed)

___

### EventClosed

Ƭ **EventClosed**: *closed*

___

### EventClosedListener

Ƭ **EventClosedListener**: (`event`: *unknown*) => *void*

The argument is actually the websocket `CloseEvent`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

___

### EventConnected

Ƭ **EventConnected**: *connected*

___

### EventConnectedListener

Ƭ **EventConnectedListener**: (`socket`: *unknown*, `payload?`: *Record*<*string*, *unknown*\>) => *void*

The first argument is actually the `WebSocket`, but to avoid
bundling DOM typings because the client can run in Node env too,
you should assert the websocket type during implementation.

Also, the second argument is the optional payload that the server may
send through the `ConnectionAck` message.

___

### EventConnecting

Ƭ **EventConnecting**: *connecting*

___

### EventConnectingListener

Ƭ **EventConnectingListener**: () => *void*

___

### EventListener

Ƭ **EventListener**<E\>: E *extends* [*EventConnecting*](client.md#eventconnecting) ? [*EventConnectingListener*](client.md#eventconnectinglistener) : E *extends* [*EventConnected*](client.md#eventconnected) ? [*EventConnectedListener*](client.md#eventconnectedlistener) : E *extends* [*EventClosed*](client.md#eventclosed) ? [*EventClosedListener*](client.md#eventclosedlistener) : *never*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | [*Event*](client.md#event) |

## Functions

### createClient

▸ **createClient**(`options`: [*ClientOptions*](../interfaces/client.clientoptions.md)): [*Client*](../interfaces/client.client-1.md)

Creates a disposable GraphQL over WebSocket client.

#### Parameters:

Name | Type |
------ | ------ |
`options` | [*ClientOptions*](../interfaces/client.clientoptions.md) |

**Returns:** [*Client*](../interfaces/client.client-1.md)
