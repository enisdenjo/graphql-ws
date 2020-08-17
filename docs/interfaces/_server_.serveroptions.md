[@enisdenjo/graphql-transport-ws](../README.md) › ["server"](../modules/_server_.md) › [ServerOptions](_server_.serveroptions.md)

# Interface: ServerOptions

## Hierarchy

* **ServerOptions**

## Index

### Properties

* [connectionInitWaitTimeout](_server_.serveroptions.md#optional-connectioninitwaittimeout)
* [execute](_server_.serveroptions.md#execute)
* [formatExecutionResult](_server_.serveroptions.md#optional-formatexecutionresult)
* [onComplete](_server_.serveroptions.md#optional-oncomplete)
* [onConnect](_server_.serveroptions.md#optional-onconnect)
* [onSubscribe](_server_.serveroptions.md#optional-onsubscribe)
* [schema](_server_.serveroptions.md#optional-schema)
* [subscribe](_server_.serveroptions.md#subscribe)
* [validationRules](_server_.serveroptions.md#optional-validationrules)

## Properties

### `Optional` connectionInitWaitTimeout

• **connectionInitWaitTimeout**? : *undefined | number*

*Defined in [server.ts:99](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L99)*

**`default`** 3 * 1000 (3 seconds)

The amount of time for which the
server will wait for `ConnectionInit` message.

Set the value to `Infinity` to skip waiting.

If the wait timeout has passed and the client
has not sent the `ConnectionInit` message,
the server will terminate the socket by
dispatching a close event `4408: Connection initialisation timeout`

___

###  execute

• **execute**: *function*

*Defined in [server.ts:55](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L55)*

Is the `subscribe` function
from GraphQL which is used to
execute the subscription operation
upon.

#### Type declaration:

▸ (`args`: ExecutionArgs): *Promise‹ExecutionResult› | ExecutionResult*

**Parameters:**

Name | Type |
------ | ------ |
`args` | ExecutionArgs |

___

### `Optional` formatExecutionResult

• **formatExecutionResult**? : *undefined | function*

*Defined in [server.ts:110](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L110)*

Format the operation execution results
if the implementation requires an adjusted
result.

___

### `Optional` onComplete

• **onComplete**? : *undefined | function*

*Defined in [server.ts:130](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L130)*

The complete callback is executed after the
operation has completed or the subscription
has been closed.

___

### `Optional` onConnect

• **onConnect**? : *undefined | function*

*Defined in [server.ts:85](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L85)*

Is the connection callback called when the
client requests the connection initialisation
through the message `ConnectionInit`. The message
payload (`connectionParams` on the client) is
present in the `Context.connectionParams`.

- Returning `true` from the callback will
allow the client to connect.

- Returning `false` from the callback will
terminate the socket by dispatching the
close event `4403: Forbidden`.

- Throwing an error from the callback will
terminate the socket by dispatching the
close event `4400: <error-message>`, where
the `<error-message>` is the message of the
thrown `Error`.

___

### `Optional` onSubscribe

• **onSubscribe**? : *undefined | function*

*Defined in [server.ts:120](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L120)*

The subscribe callback executed before
the actual operation execution. Useful
for manipulating the execution arguments
before the doing the operation.

___

### `Optional` schema

• **schema**? : *GraphQLSchema*

*Defined in [server.ts:48](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L48)*

The GraphQL schema on which the operations
will be executed and validated against. If
the schema is left undefined, one must be
provided by in the resulting `ExecutionArgs`
from the `onSubscribe` callback.

___

###  subscribe

• **subscribe**: *function*

*Defined in [server.ts:62](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L62)*

Is the `subscribe` function
from GraphQL which is used to
execute the subscription operation
upon.

#### Type declaration:

▸ (`args`: ExecutionArgs): *Promise‹AsyncIterableIterator‹ExecutionResult› | ExecutionResult›*

**Parameters:**

Name | Type |
------ | ------ |
`args` | ExecutionArgs |

___

### `Optional` validationRules

• **validationRules**? : *keyof ValidationRule[]*

*Defined in [server.ts:104](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/server.ts#L104)*

Custom validation rules overriding all
validation rules defined by the GraphQL spec.
