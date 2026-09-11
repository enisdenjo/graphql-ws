---
title: "Interface: Sink<T> (common)"
sidebarTitle: "Sink"
description: "Sink (graphql-ws/common): A representation of any set of values over any amount of time."
---
Defined in: [src/common.ts:65](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L65)

A representation of any set of values over any amount of time.

## Type Parameters

• **T** = `unknown`

## Methods

### complete()

> **complete**(): `void`

Defined in: [src/common.ts:77](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L77)

The sink has completed. This function "closes" the sink.

#### Returns

`void`

***

### error()

> **error**(`error`): `void`

Defined in: [src/common.ts:75](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L75)

An error that has occured. Calling this function "closes" the sink.
Besides the errors being `Error` and `readonly GraphQLError[]`, it
can also be a `CloseEvent`, but to avoid bundling DOM typings because
the client can run in Node env too, you should assert the close event
type during implementation.

#### Parameters

##### error

`unknown`

#### Returns

`void`

***

### next()

> **next**(`value`): `void`

Defined in: [src/common.ts:67](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L67)

Next value arriving.

#### Parameters

##### value

`T`

#### Returns

`void`
