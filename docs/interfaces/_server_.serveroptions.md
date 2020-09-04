[graphql-transport-ws](../README.md) › ["server"](../modules/_server_.md) › [ServerOptions](_server_.serveroptions.md)

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

*Defined in [server.ts:104](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L104)*

**`default`** 3 * 1000 (3 seconds)

The amount of time for which the
server will wait for `ConnectionInit` message.

Set the value to `Infinity`, '', 0, null or undefined to skip waiting.

If the wait timeout has passed and the client
has not sent the `ConnectionInit` message,
the server will terminate the socket by
dispatching a close event `4408: Connection initialisation timeout`

___

###  execute

• **execute**: *function*

*Defined in [server.ts:60](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L60)*

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

• **formatExecutionResult**? : *[ExecutionResultFormatter](../modules/_server_.md#executionresultformatter)*

*Defined in [server.ts:116](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L116)*

Format the operation execution results
if the implementation requires an adjusted
result. This formatter is run BEFORE the
`onConnect` scoped formatter.

___

### `Optional` onComplete

• **onComplete**? : *undefined | function*

*Defined in [server.ts:138](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L138)*

The complete callback is executed after the
operation has completed or the subscription
has been closed.

___

### `Optional` onConnect

• **onConnect**? : *undefined | function*

*Defined in [server.ts:90](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L90)*

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

*Defined in [server.ts:126](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L126)*

The subscribe callback executed before
the actual operation execution. Useful
for manipulating the execution arguments
before the doing the operation. As a second
item in the array, you can pass in a scoped
execution result formatter. This formatter
is run AFTER the root `formatExecutionResult`.

___

### `Optional` schema

• **schema**? : *GraphQLSchema*

*Defined in [server.ts:53](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L53)*

The GraphQL schema on which the operations
will be executed and validated against. If
the schema is left undefined, one must be
provided by in the resulting `ExecutionArgs`
from the `onSubscribe` callback.

___

###  subscribe

• **subscribe**: *function*

*Defined in [server.ts:67](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L67)*

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

• **validationRules**? : *readonly ValidationRule[]*

*Defined in [server.ts:109](https://github.com/enisdenjo/graphql-transport-ws/blob/cf71465/src/server.ts#L109)*

Custom validation rules overriding all
validation rules defined by the GraphQL spec.
