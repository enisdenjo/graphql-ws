**[graphql-transport-ws](../README.md)**

> [Globals](../README.md) / ["server"](../modules/_server_.md) / ServerOptions

# Interface: ServerOptions

## Hierarchy

* **ServerOptions**

## Index

### Properties

* [connectionInitWaitTimeout](_server_.serveroptions.md#connectioninitwaittimeout)
* [context](_server_.serveroptions.md#context)
* [execute](_server_.serveroptions.md#execute)
* [formatExecutionResult](_server_.serveroptions.md#formatexecutionresult)
* [keepAlive](_server_.serveroptions.md#keepalive)
* [onComplete](_server_.serveroptions.md#oncomplete)
* [onConnect](_server_.serveroptions.md#onconnect)
* [onSubscribe](_server_.serveroptions.md#onsubscribe)
* [roots](_server_.serveroptions.md#roots)
* [schema](_server_.serveroptions.md#schema)
* [subscribe](_server_.serveroptions.md#subscribe)
* [validationRules](_server_.serveroptions.md#validationrules)

## Properties

### connectionInitWaitTimeout

• `Optional` **connectionInitWaitTimeout**: undefined \| number

*Defined in [server.ts:126](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L126)*

**`default`** 3 * 1000 (3 seconds)

The amount of time for which the
server will wait for `ConnectionInit` message.

Set the value to `Infinity`, '', 0, null or undefined to skip waiting.

If the wait timeout has passed and the client
has not sent the `ConnectionInit` message,
the server will terminate the socket by
dispatching a close event `4408: Connection initialisation timeout`

___

### context

• `Optional` **context**: SubscriptionArgs[\"contextValue\"]

*Defined in [server.ts:61](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L61)*

A value which is provided to every resolver and holds
important contextual information like the currently
logged in user, or access to a database.
Related operation context value will be injected to the
`ExecutionArgs` BEFORE the `onSubscribe` callback.

___

### execute

•  **execute**: (args: ExecutionArgs) => Promise\<AsyncIterableIterator\<ExecutionResult> \| ExecutionResult> \| AsyncIterableIterator\<ExecutionResult> \| ExecutionResult

*Defined in [server.ts:79](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L79)*

Is the `execute` function from GraphQL which is
used to execute the query/mutation operation.

___

### formatExecutionResult

• `Optional` **formatExecutionResult**: [ExecutionResultFormatter](../modules/_server_.md#executionresultformatter)

*Defined in [server.ts:138](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L138)*

Format the operation execution results
if the implementation requires an adjusted
result. This formatter is run BEFORE the
`onConnect` scoped formatter.

___

### keepAlive

• `Optional` **keepAlive**: undefined \| number

*Defined in [server.ts:169](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L169)*

The timout between dispatched keep-alive messages. Internally the lib
uses the [WebSocket Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets)) to check that the link between
the clients and the server is operating and to prevent the link from being broken due to idling.
Set to nullish value to disable.

**`default`** 12 * 1000 (12 seconds)

___

### onComplete

• `Optional` **onComplete**: undefined \| (ctx: [Context](_server_.context.md), message: [CompleteMessage](_message_.completemessage.md)) => void

*Defined in [server.ts:160](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L160)*

The complete callback is executed after the
operation has completed or the subscription
has been closed.

___

### onConnect

• `Optional` **onConnect**: undefined \| (ctx: [Context](_server_.context.md)) => Promise\<boolean> \| boolean

*Defined in [server.ts:112](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L112)*

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

### onSubscribe

• `Optional` **onSubscribe**: undefined \| (ctx: [Context](_server_.context.md), message: [SubscribeMessage](_message_.subscribemessage.md), args: Optional\<ExecutionArgs, \"schema\">) => Promise\<[ExecutionArgs, undefined \| [ExecutionResultFormatter](../modules/_server_.md#executionresultformatter)]> \| [ExecutionArgs, undefined \| [ExecutionResultFormatter](../modules/_server_.md#executionresultformatter)]

*Defined in [server.ts:148](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L148)*

The subscribe callback executed before
the actual operation execution. Useful
for manipulating the execution arguments
before the doing the operation. As a second
item in the array, you can pass in a scoped
execution result formatter. This formatter
is run AFTER the root `formatExecutionResult`.

___

### roots

• `Optional` **roots**: undefined \| {}

*Defined in [server.ts:69](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L69)*

The GraphQL root fields or resolvers to go
alongside the schema. Learn more about them
here: https://graphql.org/learn/execution/#root-fields-resolvers.
Related operation root value will be injected to the
`ExecutionArgs` BEFORE the `onSubscribe` callback.

___

### schema

• `Optional` **schema**: GraphQLSchema

*Defined in [server.ts:53](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L53)*

The GraphQL schema on which the operations
will be executed and validated against. If
the schema is left undefined, one must be
provided by in the resulting `ExecutionArgs`
from the `onSubscribe` callback.

___

### subscribe

•  **subscribe**: (args: ExecutionArgs) => Promise\<AsyncIterableIterator\<ExecutionResult> \| ExecutionResult>

*Defined in [server.ts:89](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L89)*

Is the `subscribe` function from GraphQL which is
used to execute the subscription operation.

___

### validationRules

• `Optional` **validationRules**: readonly ValidationRule[]

*Defined in [server.ts:131](https://github.com/enisdenjo/graphql-transport-ws/blob/d8060fe/src/server.ts#L131)*

Custom validation rules overriding all
validation rules defined by the GraphQL spec.
