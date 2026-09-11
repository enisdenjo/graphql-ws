---
title: "Class: TerminatedCloseEvent (client)"
sidebarTitle: "TerminatedCloseEvent"
description: "TerminatedCloseEvent (graphql-ws/client): A synthetic close event 4499: Terminated is issued to the current to immediately"
---
Defined in: [src/client.ts:1055](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L1055)

A synthetic close event `4499: Terminated` is issued to the current to immediately
close the connection without waiting for the one coming from `WebSocket.onclose`.

Terminating is not considered fatal and a connection retry will occur as expected.

Useful in cases where the WebSocket is stuck and not emitting any events;
can happen on iOS Safari, see: https://github.com/enisdenjo/graphql-ws/discussions/290.

## Extends

- `Error`

## Constructors

### new TerminatedCloseEvent()

> **new TerminatedCloseEvent**(`message`?): [`TerminatedCloseEvent`](/docs/client/classes/TerminatedCloseEvent)

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1082

#### Parameters

##### message?

`string`

#### Returns

[`TerminatedCloseEvent`](/docs/client/classes/TerminatedCloseEvent)

#### Inherited from

`Error.constructor`

### new TerminatedCloseEvent()

> **new TerminatedCloseEvent**(`message`?, `options`?): [`TerminatedCloseEvent`](/docs/client/classes/TerminatedCloseEvent)

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1082

#### Parameters

##### message?

`string`

##### options?

`ErrorOptions`

#### Returns

[`TerminatedCloseEvent`](/docs/client/classes/TerminatedCloseEvent)

#### Inherited from

`Error.constructor`

## Properties

### code

> **code**: `number` = `4499`

Defined in: [src/client.ts:1058](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L1058)

***

### message

> **message**: `string` = `'4499: Terminated'`

Defined in: [src/client.ts:1057](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L1057)

#### Overrides

`Error.message`

***

### name

> **name**: `string` = `'TerminatedCloseEvent'`

Defined in: [src/client.ts:1056](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L1056)

#### Overrides

`Error.name`

***

### reason

> **reason**: `string` = `'Terminated'`

Defined in: [src/client.ts:1059](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L1059)

***

### wasClean

> **wasClean**: `boolean` = `false`

Defined in: [src/client.ts:1060](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L1060)
