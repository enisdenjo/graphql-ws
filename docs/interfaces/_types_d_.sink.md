[@enisdenjo/graphql-transport-ws](../README.md) › ["types.d"](../modules/_types_d_.md) › [Sink](_types_d_.sink.md)

# Interface: Sink ‹**T**›

A representation of any set of values over any amount of time.

## Type parameters

▪ **T**

## Hierarchy

* **Sink**

## Index

### Methods

* [complete](_types_d_.sink.md#complete)
* [error](_types_d_.sink.md#error)
* [next](_types_d_.sink.md#next)

## Methods

###  complete

▸ **complete**(): *void*

*Defined in [types.d.ts:29](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/types.d.ts#L29)*

The sink has completed. This function "closes" the sink.

**Returns:** *void*

___

###  error

▸ **error**(`error`: Error | keyof GraphQLError[]): *void*

*Defined in [types.d.ts:27](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/types.d.ts#L27)*

An error that has occured. Calling this function "closes" the sink.

**Parameters:**

Name | Type |
------ | ------ |
`error` | Error &#124; keyof GraphQLError[] |

**Returns:** *void*

___

###  next

▸ **next**(`value`: T): *void*

*Defined in [types.d.ts:25](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/types.d.ts#L25)*

Next value arriving.

**Parameters:**

Name | Type |
------ | ------ |
`value` | T |

**Returns:** *void*
