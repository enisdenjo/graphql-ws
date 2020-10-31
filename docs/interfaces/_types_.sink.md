**[graphql-ws](../README.md)**

> [Globals](../README.md) / ["types"](../modules/_types_.md) / Sink

# Interface: Sink\<T>

A representation of any set of values over any amount of time.

## Type parameters

Name | Default |
------ | ------ |
`T` | unknown |

## Hierarchy

* **Sink**

## Index

### Methods

* [complete](_types_.sink.md#complete)
* [error](_types_.sink.md#error)
* [next](_types_.sink.md#next)

## Methods

### complete

▸ **complete**(): void

The sink has completed. This function "closes" the sink.

**Returns:** void

___

### error

▸ **error**(`error`: Error \| readonly GraphQLError[] \| unknown): void

An error that has occured. Calling this function "closes" the sink.
The error can be also `CloseEvent`, but to avoid bundling DOM typings
because the client can run in Node env too, you should assert
the close event type during implementation.

#### Parameters:

Name | Type |
------ | ------ |
`error` | Error \| readonly GraphQLError[] \| unknown |

**Returns:** void

___

### next

▸ **next**(`value`: T): void

Next value arriving.

#### Parameters:

Name | Type |
------ | ------ |
`value` | T |

**Returns:** void
