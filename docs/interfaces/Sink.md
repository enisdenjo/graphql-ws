[graphql-ws](../README.md) / Sink

# Interface: Sink<T\>

A representation of any set of values over any amount of time.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Table of contents

### Methods

- [complete](Sink.md#complete)
- [error](Sink.md#error)
- [next](Sink.md#next)

## Methods

### complete

▸ **complete**(): `void`

The sink has completed. This function "closes" the sink.

#### Returns

`void`

___

### error

▸ **error**(`error`): `void`

An error that has occured. Calling this function "closes" the sink.
Besides the errors being `Error` and `readonly GraphQLError[]`, it
can also be a `CloseEvent`, but to avoid bundling DOM typings because
the client can run in Node env too, you should assert the close event
type during implementation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `unknown` |

#### Returns

`void`

___

### next

▸ **next**(`value`): `void`

Next value arriving.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` |

#### Returns

`void`
