**[graphql-ws](../README.md)**

> [Globals](../README.md) / ["server"](../modules/_server_.md) / ServerOptions

# Interface: ServerOptions

## Hierarchy

* **ServerOptions**

## Index

### Properties

* [connectionInitWaitTimeout](_server_.serveroptions.md#connectioninitwaittimeout)
* [context](_server_.serveroptions.md#context)
* [execute](_server_.serveroptions.md#execute)
* [keepAlive](_server_.serveroptions.md#keepalive)
* [onComplete](_server_.serveroptions.md#oncomplete)
* [onConnect](_server_.serveroptions.md#onconnect)
* [onError](_server_.serveroptions.md#onerror)
* [onNext](_server_.serveroptions.md#onnext)
* [onOperation](_server_.serveroptions.md#onoperation)
* [onSubscribe](_server_.serveroptions.md#onsubscribe)
* [roots](_server_.serveroptions.md#roots)
* [schema](_server_.serveroptions.md#schema)
* [subscribe](_server_.serveroptions.md#subscribe)

## Properties

### connectionInitWaitTimeout

• `Optional` **connectionInitWaitTimeout**: undefined \| number

The amount of time for which the server will wait
for `ConnectionInit` message.

Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.

If the wait timeout has passed and the client
has not sent the `ConnectionInit` message,
the server will terminate the socket by
dispatching a close event `4408: Connection initialisation timeout`

**`default`** 3 * 1000 (3 seconds)

___

### context

• `Optional` **context**: [GraphQLExecutionContextValue](../modules/_server_.md#graphqlexecutioncontextvalue) \| (ctx: [Context](_server_.context.md), message: [SubscribeMessage](_message_.subscribemessage.md), args: ExecutionArgs) => [GraphQLExecutionContextValue](../modules/_server_.md#graphqlexecutioncontextvalue)

A value which is provided to every resolver and holds
important contextual information like the currently
logged in user, or access to a database.

If you return from `onSubscribe`, and the returned value is
missing the `contextValue` field, this context will be used
instead.

If you use the function signature, the final execution arguments
will be passed in (also the returned value from `onSubscribe`).
Since the context is injected on every subscribe, the `SubscribeMessage`
with the regular `Context` will be passed in through the arguments too.

___

### execute

•  **execute**: (args: ExecutionArgs) => [OperationResult](../modules/_server_.md#operationresult)

Is the `execute` function from GraphQL which is
used to execute the query and mutation operations.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### keepAlive

• `Optional` **keepAlive**: undefined \| number

The timout between dispatched keep-alive messages. Internally the lib
uses the [WebSocket Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets)) to check that the link between
the clients and the server is operating and to prevent the link from being broken due to idling.

Set to nullish value to disable.

**`default`** 12 * 1000 (12 seconds)

___

### onComplete

• `Optional` **onComplete**: undefined \| (ctx: [Context](_server_.context.md), message: [CompleteMessage](_message_.completemessage.md)) => Promise\<void> \| void

The complete callback is executed after the
operation has completed right before sending
the complete message to the client.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### onConnect

• `Optional` **onConnect**: undefined \| (ctx: [Context](_server_.context.md)) => Promise\<boolean \| void> \| boolean \| void

Is the connection callback called when the
client requests the connection initialisation
through the message `ConnectionInit`.

The message payload (`connectionParams` from the
client) is present in the `Context.connectionParams`.

- Returning `true` or nothing from the callback will
allow the client to connect.

- Returning `false` from the callback will
terminate the socket by dispatching the
close event `4403: Forbidden`.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### onError

• `Optional` **onError**: undefined \| (ctx: [Context](_server_.context.md), message: [ErrorMessage](_message_.errormessage.md), errors: readonly GraphQLError[]) => Promise\<readonly GraphQLError[] \| void> \| readonly GraphQLError[] \| void

Executed after an error occured right before it
has been dispatched to the client.

Use this callback to format the outgoing GraphQL
errors before they reach the client.

Returned result will be injected in the error message payload.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### onNext

• `Optional` **onNext**: undefined \| (ctx: [Context](_server_.context.md), message: [NextMessage](_message_.nextmessage.md), args: ExecutionArgs, result: ExecutionResult) => Promise\<ExecutionResult \| void> \| ExecutionResult \| void

Executed after an operation has emitted a result right before
that result has been sent to the client. Results from both
single value and streaming operations will appear in this callback.

Use this callback if you want to format the execution result
before it reaches the client.

Returned result will be injected in the next message payload.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### onOperation

• `Optional` **onOperation**: undefined \| (ctx: [Context](_server_.context.md), message: [SubscribeMessage](_message_.subscribemessage.md), args: ExecutionArgs, result: [OperationResult](../modules/_server_.md#operationresult)) => Promise\<[OperationResult](../modules/_server_.md#operationresult) \| void> \| [OperationResult](../modules/_server_.md#operationresult) \| void

Executed after the operation call resolves. For streaming
operations, triggering this callback does not necessarely
mean that there is already a result available - it means
that the subscription process for the stream has resolved
and that the client is now subscribed.

The `OperationResult` argument is the result of operation
execution. It can be an iterator or already a value.

If you want the single result and the events from a streaming
operation, use the `onNext` callback.

Use this callback to listen for subscribe operation and
execution result manipulation.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### onSubscribe

• `Optional` **onSubscribe**: undefined \| (ctx: [Context](_server_.context.md), message: [SubscribeMessage](_message_.subscribemessage.md)) => Promise\<ExecutionArgs \| readonly GraphQLError[] \| void> \| ExecutionArgs \| readonly GraphQLError[] \| void

The subscribe callback executed right after
acknowledging the request before any payload
processing has been performed.

If you return `ExecutionArgs` from the callback,
it will be used instead of trying to build one
internally. In this case, you are responsible
for providing a ready set of arguments which will
be directly plugged in the operation execution.

Omitting the fields `contextValue` or `rootValue`
from the returned value will have the provided server
options fill in the gaps.

To report GraphQL errors simply return an array
of them from the callback, they will be reported
to the client through the error message.

Useful for preparing the execution arguments
following a custom logic. A typical use case are
persisted queries, you can identify the query from
the subscribe message and create the GraphQL operation
execution args which are then returned by the function.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

___

### roots

• `Optional` **roots**: undefined \| {}

The GraphQL root fields or resolvers to go
alongside the schema. Learn more about them
here: https://graphql.org/learn/execution/#root-fields-resolvers.

If you return from `onSubscribe`, and the returned value is
missing the `rootValue` field, the relevant operation root
will be used instead.

___

### schema

• `Optional` **schema**: GraphQLSchema

The GraphQL schema on which the operations
will be executed and validated against.

If the schema is left undefined, you're trusted to
provide one in the returned `ExecutionArgs` from the
`onSubscribe` callback.

___

### subscribe

•  **subscribe**: (args: ExecutionArgs) => [OperationResult](../modules/_server_.md#operationresult)

Is the `subscribe` function from GraphQL which is
used to execute the subscription operation.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.
