[graphql-transport-ws](../README.md) › ["server"](../modules/_server_.md) › [ServerOptions](_server_.serveroptions.md)

# Interface: ServerOptions

## Hierarchy

* **ServerOptions**

## Index

### Properties

* [connectionInitWaitTimeout](_server_.serveroptions.md#optional-connectioninitwaittimeout)
* [execute](_server_.serveroptions.md#execute)
* [formatExecutionResult](_server_.serveroptions.md#optional-formatexecutionresult)
* [keepAlive](_server_.serveroptions.md#optional-keepalive)
* [onComplete](_server_.serveroptions.md#optional-oncomplete)
* [onConnect](_server_.serveroptions.md#optional-onconnect)
* [onSubscribe](_server_.serveroptions.md#optional-onsubscribe)
* [roots](_server_.serveroptions.md#optional-roots)
* [schema](_server_.serveroptions.md#optional-schema)
* [subscribe](_server_.serveroptions.md#subscribe)
* [validationRules](_server_.serveroptions.md#optional-validationrules)

## Properties

### `Optional` connectionInitWaitTimeout

• **connectionInitWaitTimeout**? : *undefined | number*

*Defined in [server.ts:115](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L115)*

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

*Defined in [server.ts:71](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L71)*

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

*Defined in [server.ts:127](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L127)*

Format the operation execution results
if the implementation requires an adjusted
result. This formatter is run BEFORE the
`onConnect` scoped formatter.

___

### `Optional` keepAlive

• **keepAlive**? : *undefined | number*

*Defined in [server.ts:158](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L158)*

The timout between dispatched keep-alive messages. Internally the lib
uses the [WebSocket Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets)) to check that the link between
the clients and the server is operating and to prevent the link from being broken due to idling.
Set to nullish value to disable.

**`default`** 12 * 1000 (12 seconds)

___

### `Optional` onComplete

• **onComplete**? : *undefined | function*

*Defined in [server.ts:149](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L149)*

The complete callback is executed after the
operation has completed or the subscription
has been closed.

___

### `Optional` onConnect

• **onConnect**? : *undefined | function*

*Defined in [server.ts:101](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L101)*

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

*Defined in [server.ts:137](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L137)*

The subscribe callback executed before
the actual operation execution. Useful
for manipulating the execution arguments
before the doing the operation. As a second
item in the array, you can pass in a scoped
execution result formatter. This formatter
is run AFTER the root `formatExecutionResult`.

___

### `Optional` roots

• **roots**? : *undefined | object*

*Defined in [server.ts:62](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L62)*

The GraphQL root fields or resolvers to go
alongside the schema. Learn more about them
here: https://graphql.org/learn/execution/#root-fields-resolvers.
Related operation root value will be injected to the
`ExecutionArgs` BEFORE the `onSubscribe` callback.

___

### `Optional` schema

• **schema**? : *GraphQLSchema*

*Defined in [server.ts:54](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L54)*

The GraphQL schema on which the operations
will be executed and validated against. If
the schema is left undefined, one must be
provided by in the resulting `ExecutionArgs`
from the `onSubscribe` callback.

___

###  subscribe

• **subscribe**: *function*

*Defined in [server.ts:78](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L78)*

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

*Defined in [server.ts:120](https://github.com/enisdenjo/graphql-transport-ws/blob/bb59cf9/src/server.ts#L120)*

Custom validation rules overriding all
validation rules defined by the GraphQL spec.
