---
title: "Interface: ServerOptions<P, E> (server)"
sidebarTitle: "ServerOptions"
description: "ServerOptions (graphql-ws/server): The amount of time for which the server will wait"
---
Defined in: [src/server.ts:72](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L72)

## Type Parameters

• **P** *extends* [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage)\[`"payload"`\] = [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage)\[`"payload"`\]

• **E** = `unknown`

## Properties

### connectionInitWaitTimeout?

> `optional` **connectionInitWaitTimeout**: `number`

Defined in: [src/server.ts:203](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L203)

The amount of time for which the server will wait
for `ConnectionInit` message.

Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.

If the wait timeout has passed and the client
has not sent the `ConnectionInit` message,
the server will terminate the socket by
dispatching a close event `4408: Connection initialisation timeout`

#### Default

```ts
3_000 // 3 seconds
```

***

### context?

> `optional` **context**: [`GraphQLExecutionContextValue`](/docs/server/type-aliases/GraphQLExecutionContextValue) \| (`ctx`, `id`, `payload`, `args`) => GraphQLExecutionContextValue \| Promise\<GraphQLExecutionContextValue\>

Defined in: [src/server.ts:120](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L120)

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

Note that the context function is invoked on each operation only once.
Meaning, for subscriptions, only at the point of initialising the subscription;
not on every subscription event emission. Read more about the context lifecycle
in subscriptions here: https://github.com/graphql/graphql-js/issues/894.

***

### execute()?

> `optional` **execute**: (`args`) => [`OperationResult`](/docs/server/type-aliases/OperationResult)

Defined in: [src/server.ts:180](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L180)

Is the `execute` function from GraphQL which is
used to execute the query and mutation operations.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

#### Parameters

##### args

`ExecutionArgs`

#### Returns

[`OperationResult`](/docs/server/type-aliases/OperationResult)

***

### jsonMessageReplacer?

> `optional` **jsonMessageReplacer**: [`JSONMessageReplacer`](/docs/common/type-aliases/JSONMessageReplacer)

Defined in: [src/server.ts:431](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L431)

An optional override for the JSON.stringify function used to serialize
outgoing messages to from server. Useful for serializing custom
datatypes out to the client.

***

### jsonMessageReviver?

> `optional` **jsonMessageReviver**: [`JSONMessageReviver`](/docs/common/type-aliases/JSONMessageReviver)

Defined in: [src/server.ts:425](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L425)

An optional override for the JSON.parse function used to hydrate
incoming messages to this server. Useful for parsing custom datatypes
out of the incoming JSON.

***

### onClose()?

> `optional` **onClose**: (`ctx`, `code`?, `reason`?) => `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:274](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L274)

Called when the socket closes for whatever reason, at any
point in time. Provides the close event too. Beware
that this callback happens AFTER all subscriptions have
been gracefully completed and AFTER the `onDisconnect` callback.

If you are interested in tracking the subscriptions completions,
consider using the `onComplete` callback.

In comparison to `onDisconnect`, this callback will ALWAYS
be called, regardless if the user successfully went through
the connection initialisation or not. `onConnect` might not
called before the `onClose`.

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### code?

`number`

##### reason?

`string`

#### Returns

`void` \| `Promise`\<`void`\>

***

### onComplete()?

> `optional` **onComplete**: (`ctx`, `id`, `payload`) => `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:413](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L413)

The complete callback is executed after the
operation has completed right before sending
the complete message to the client.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

Since the library makes sure to complete streaming
operations even after an abrupt closure, this callback
will still be called.

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### id

`string`

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

#### Returns

`void` \| `Promise`\<`void`\>

***

### onConnect()?

> `optional` **onConnect**: (`ctx`) => `boolean` \| `void` \| `Record`\<`string`, `unknown`\> \| `Promise`\<`boolean` \| `void` \| `Record`\<`string`, `unknown`\>\>

Defined in: [src/server.ts:228](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L228)

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

- Returning a `Record` from the callback will
allow the client to connect and pass the returned
value to the client through the optional `payload`
field in the `ConnectionAck` message.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

#### Returns

`boolean` \| `void` \| `Record`\<`string`, `unknown`\> \| `Promise`\<`boolean` \| `void` \| `Record`\<`string`, `unknown`\>\>

***

### onDisconnect()?

> `optional` **onDisconnect**: (`ctx`, `code`?, `reason`?) => `void` \| `Promise`\<`void`\>

Defined in: [src/server.ts:253](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L253)

Called when the client disconnects for whatever reason after
he successfully went through the connection initialisation phase.
Provides the close event too. Beware that this callback happens
AFTER all subscriptions have been gracefully completed and BEFORE
the `onClose` callback.

If you are interested in tracking the subscriptions completions,
consider using the `onComplete` callback.

This callback will be called EXCLUSIVELY if the client connection
is acknowledged. Meaning, `onConnect` will be called before the `onDisconnect`.

For tracking socket closures at any point in time, regardless
of the connection state - consider using the `onClose` callback.

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### code?

`number`

##### reason?

`string`

#### Returns

`void` \| `Promise`\<`void`\>

***

### onError()?

> `optional` **onError**: (`ctx`, `id`, `payload`, `errors`) => `void` \| readonly `GraphQLFormattedError`[] \| `Promise`\<`void` \| readonly `GraphQLFormattedError`[]\>

Defined in: [src/server.ts:363](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L363)

Executed after an error occurred right before it
has been dispatched to the client.

Use this callback to format the outgoing GraphQL
errors before they reach the client.

Returned result will be injected in the error message payload.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### id

`string`

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

##### errors

readonly `GraphQLError`[]

#### Returns

`void` \| readonly `GraphQLFormattedError`[] \| `Promise`\<`void` \| readonly `GraphQLFormattedError`[]\>

***

### onNext()?

> `optional` **onNext**: (`ctx`, `id`, `payload`, `args`, `result`) => `void` \| `FormattedExecutionResult` \| `Promise`\<`void` \| `FormattedExecutionResult`\>

Defined in: [src/server.ts:388](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L388)

Executed after an operation has emitted a result right before
that result has been sent to the client. Results from both
single value and streaming operations will appear in this callback.

Use this callback if you want to format the execution result
before it reaches the client.

Returned result will be injected in the next message payload.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### id

`string`

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

##### args

`ExecutionArgs`

##### result

[`ExecutionResult`](/docs/common/interfaces/ExecutionResult)

#### Returns

`void` \| `FormattedExecutionResult` \| `Promise`\<`void` \| `FormattedExecutionResult`\>

***

### onOperation()?

> `optional` **onOperation**: (`ctx`, `id`, `payload`, `args`, `result`) => `void` \| [`OperationResult`](/docs/server/type-aliases/OperationResult) \| `Promise`\<void \| OperationResult\>

Defined in: [src/server.ts:341](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L341)

Executed after the operation call resolves. For streaming
operations, triggering this callback does not necessarily
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

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### id

`string`

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

##### args

`ExecutionArgs`

##### result

[`OperationResult`](/docs/server/type-aliases/OperationResult)

#### Returns

`void` \| [`OperationResult`](/docs/server/type-aliases/OperationResult) \| `Promise`\<void \| OperationResult\>

***

### onSubscribe()?

> `optional` **onSubscribe**: (`ctx`, `id`, `payload`) => `void` \| readonly `GraphQLError`[] \| `ExecutionArgs` \| `Promise`\<`void` \| readonly `GraphQLError`[] \| `ExecutionArgs`\>

Defined in: [src/server.ts:310](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L310)

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

#### Parameters

##### ctx

[`Context`](/docs/server/interfaces/Context)\<`P`, `E`\>

##### id

`string`

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

#### Returns

`void` \| readonly `GraphQLError`[] \| `ExecutionArgs` \| `Promise`\<`void` \| readonly `GraphQLError`[] \| `ExecutionArgs`\>

***

### parse()?

> `optional` **parse**: (`source`, `options`?) => `DocumentNode`

Defined in: [src/server.ts:157](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L157)

A custom GraphQL parse function allowing you to apply your own
parsing logic.

Will not be used when implementing a custom `onSubscribe`.

Throwing an error from within this function will close the socket
with the `Error` message in the close event reason.

Given a GraphQL source, parses it into a Document.
Throws GraphQLError if a syntax error is encountered.

#### Parameters

##### source

`string` | `Source`

##### options?

`ParseOptions`

#### Returns

`DocumentNode`

***

### roots?

> `optional` **roots**: `object`

Defined in: [src/server.ts:140](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L140)

The GraphQL root fields or resolvers to go
alongside the schema. Learn more about them
here: https://graphql.org/learn/execution/#root-fields-resolvers.

If you return from `onSubscribe`, and the returned value is
missing the `rootValue` field, the relevant operation root
will be used instead.

#### mutation?

> `optional` **mutation**: `Record`\<`string`, \{\}\>

#### query?

> `optional` **query**: `Record`\<`string`, \{\}\>

#### subscription?

> `optional` **subscription**: `Record`\<`string`, \{\}\>

***

### schema?

> `optional` **schema**: `GraphQLSchema` \| (`ctx`, `id`, `payload`, `args`) => `GraphQLSchema` \| `Promise`\<`GraphQLSchema`\>

Defined in: [src/server.ts:92](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L92)

The GraphQL schema on which the operations
will be executed and validated against.

If a function is provided, it will be called on
every subscription request allowing you to manipulate
schema dynamically.

If the schema is left undefined, you're trusted to
provide one in the returned `ExecutionArgs` from the
`onSubscribe` callback.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

***

### subscribe()?

> `optional` **subscribe**: (`args`) => [`OperationResult`](/docs/server/type-aliases/OperationResult)

Defined in: [src/server.ts:189](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L189)

Is the `subscribe` function from GraphQL which is
used to execute the subscription operation.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

#### Parameters

##### args

`ExecutionArgs`

#### Returns

[`OperationResult`](/docs/server/type-aliases/OperationResult)

***

### validate()?

> `optional` **validate**: (`schema`, `documentAST`, `rules`?, `options`?, `typeInfo`?) => `ReadonlyArray`\<`GraphQLError`\>

Defined in: [src/server.ts:171](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L171)

A custom GraphQL validate function allowing you to apply your
own validation rules.

Returned, non-empty, array of `GraphQLError`s will be communicated
to the client through the `ErrorMessage`. Use an empty array if the
document is valid and no errors have been encountered.

Will not be used when implementing a custom `onSubscribe`.

Throwing an error from within this function will close the socket
with the `Error` message in the close event reason.

Implements the "Validation" section of the spec.

Validation runs synchronously, returning an array of encountered errors, or
an empty array if no errors were encountered and the document is valid.

A list of specific validation rules may be provided. If not provided, the
default list of rules defined by the GraphQL specification will be used.

Each validation rules is a function which returns a visitor
(see the language/visitor API). Visitor methods are expected to return
GraphQLErrors, or Arrays of GraphQLErrors when invalid.

Validate will stop validation after a `maxErrors` limit has been reached.
Attackers can send pathologically invalid queries to induce a DoS attack,
so by default `maxErrors` set to 100 errors.

Optionally a custom TypeInfo instance may be provided. If not provided, one
will be created from the provided schema.

#### Parameters

##### schema

`GraphQLSchema`

##### documentAST

`DocumentNode`

##### rules?

readonly `ValidationRule`[]

##### options?

##### typeInfo?

`TypeInfo`

**Deprecated**

will be removed in 17.0.0

#### Returns

`ReadonlyArray`\<`GraphQLError`\>
