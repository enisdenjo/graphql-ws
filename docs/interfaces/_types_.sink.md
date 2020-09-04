[graphql-transport-ws](../README.md) › ["types"](../modules/_types_.md) › [Sink](_types_.sink.md)

# Interface: Sink ‹**T**›

A representation of any set of values over any amount of time.

## Type parameters

▪ **T**

## Hierarchy

* **Sink**

## Index

### Methods

* [complete](_types_.sink.md#complete)
* [error](_types_.sink.md#error)
* [next](_types_.sink.md#next)

## Methods

###  complete

▸ **complete**(): *void*

*Defined in [types.ts:29](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/types.ts#L29)*

The sink has completed. This function "closes" the sink.

**Returns:** *void*

___

###  error

▸ **error**(`error`: Error | CloseEvent | readonly GraphQLError[]): *void*

*Defined in [types.ts:27](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/types.ts#L27)*

An error that has occured. Calling this function "closes" the sink.

**Parameters:**

Name | Type |
------ | ------ |
`error` | Error &#124; CloseEvent &#124; readonly GraphQLError[] |

**Returns:** *void*

___

###  next

▸ **next**(`value`: T): *void*

*Defined in [types.ts:25](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/types.ts#L25)*

Next value arriving.

**Parameters:**

Name | Type |
------ | ------ |
`value` | T |

**Returns:** *void*
