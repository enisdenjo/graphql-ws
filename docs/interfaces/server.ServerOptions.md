[graphql-ws](../README.md) / [server](../modules/server.md) / ServerOptions

# Interface: ServerOptions<P, E\>

[server](../modules/server.md).ServerOptions

## Type parameters

| Name | Type |
| :------ | :------ |
| `P` | extends [`ConnectionInitMessage`](common.ConnectionInitMessage.md)[``"payload"``] = [`ConnectionInitMessage`](common.ConnectionInitMessage.md)[``"payload"``] |
| `E` | `unknown` |

## Table of contents

### Properties

- [connectionInitWaitTimeout](server.ServerOptions.md#connectioninitwaittimeout)
- [context](server.ServerOptions.md#context)
- [execute](server.ServerOptions.md#execute)
- [jsonMessageReplacer](server.ServerOptions.md#jsonmessagereplacer)
- [jsonMessageReviver](server.ServerOptions.md#jsonmessagereviver)
- [onClose](server.ServerOptions.md#onclose)
- [onComplete](server.ServerOptions.md#oncomplete)
- [onConnect](server.ServerOptions.md#onconnect)
- [onDisconnect](server.ServerOptions.md#ondisconnect)
- [onError](server.ServerOptions.md#onerror)
- [onNext](server.ServerOptions.md#onnext)
- [onOperation](server.ServerOptions.md#onoperation)
- [onSubscribe](server.ServerOptions.md#onsubscribe)
- [roots](server.ServerOptions.md#roots)
- [schema](server.ServerOptions.md#schema)
- [subscribe](server.ServerOptions.md#subscribe)
- [validate](server.ServerOptions.md#validate)

## Properties

### connectionInitWaitTimeout

• `Optional` **connectionInitWaitTimeout**: `number`

The amount of time for which the server will wait
for `ConnectionInit` message.

Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.

If the wait timeout has passed and the client
has not sent the `ConnectionInit` message,
the server will terminate the socket by
dispatching a close event `4408: Connection initialisation timeout`

**`Default`**

3_000 // 3 seconds

___

### context

• `Optional` **context**: [`GraphQLExecutionContextValue`](../modules/server.md#graphqlexecutioncontextvalue) \| (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`SubscribeMessage`](common.SubscribeMessage.md), `args`: `ExecutionArgs`) => [`GraphQLExecutionContextValue`](../modules/server.md#graphqlexecutioncontextvalue) \| `Promise`<[`GraphQLExecutionContextValue`](../modules/server.md#graphqlexecutioncontextvalue)\>

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

___

### execute

• `Optional` **execute**: (`args`: `ExecutionArgs`) => [`OperationResult`](../modules/server.md#operationresult)

#### Type declaration

▸ (`args`): [`OperationResult`](../modules/server.md#operationresult)

Is the `execute` function from GraphQL which is
used to execute the query and mutation operations.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

##### Parameters

| Name | Type |
| :------ | :------ |
| `args` | `ExecutionArgs` |

##### Returns

[`OperationResult`](../modules/server.md#operationresult)

___

### jsonMessageReplacer

• `Optional` **jsonMessageReplacer**: [`JSONMessageReplacer`](../modules/common.md#jsonmessagereplacer)

An optional override for the JSON.stringify function used to serialize
outgoing messages to from server. Useful for serializing custom
datatypes out to the client.

___

### jsonMessageReviver

• `Optional` **jsonMessageReviver**: [`JSONMessageReviver`](../modules/common.md#jsonmessagereviver)

An optional override for the JSON.parse function used to hydrate
incoming messages to this server. Useful for parsing custom datatypes
out of the incoming JSON.

___

### onClose

• `Optional` **onClose**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `code`: `number`, `reason`: `string`) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`ctx`, `code`, `reason`): `void` \| `Promise`<`void`\>

Called when the socket closes for whatever reason, at any
point in time. Provides the close event too. Beware
that this callback happens AFTER all subscriptions have
been gracefully completed and AFTER the `onDisconnect` callback.

If you are interested in tracking the subscriptions completions,
consider using the `onComplete` callback.

In comparison to `onDisconnect`, this callback will ALWAYS
be called, regardless if the user succesfully went through
the connection initialisation or not. `onConnect` might not
called before the `onClose`.

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `code` | `number` |
| `reason` | `string` |

##### Returns

`void` \| `Promise`<`void`\>

___

### onComplete

• `Optional` **onComplete**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`CompleteMessage`](common.CompleteMessage.md)) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`ctx`, `message`): `void` \| `Promise`<`void`\>

The complete callback is executed after the
operation has completed right before sending
the complete message to the client.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

Since the library makes sure to complete streaming
operations even after an abrupt closure, this callback
will still be called.

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `message` | [`CompleteMessage`](common.CompleteMessage.md) |

##### Returns

`void` \| `Promise`<`void`\>

___

### onConnect

• `Optional` **onConnect**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>) => `boolean` \| `void` \| `Record`<`string`, `unknown`\> \| `Promise`<`boolean` \| `void` \| `Record`<`string`, `unknown`\>\>

#### Type declaration

▸ (`ctx`): `boolean` \| `void` \| `Record`<`string`, `unknown`\> \| `Promise`<`boolean` \| `void` \| `Record`<`string`, `unknown`\>\>

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

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |

##### Returns

`boolean` \| `void` \| `Record`<`string`, `unknown`\> \| `Promise`<`boolean` \| `void` \| `Record`<`string`, `unknown`\>\>

___

### onDisconnect

• `Optional` **onDisconnect**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `code`: `number`, `reason`: `string`) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`ctx`, `code`, `reason`): `void` \| `Promise`<`void`\>

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

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `code` | `number` |
| `reason` | `string` |

##### Returns

`void` \| `Promise`<`void`\>

___

### onError

• `Optional` **onError**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`ErrorMessage`](common.ErrorMessage.md), `errors`: readonly `GraphQLError`[]) => `void` \| readonly `GraphQLError`[] \| `Promise`<`void` \| readonly `GraphQLError`[]\>

#### Type declaration

▸ (`ctx`, `message`, `errors`): `void` \| readonly `GraphQLError`[] \| `Promise`<`void` \| readonly `GraphQLError`[]\>

Executed after an error occured right before it
has been dispatched to the client.

Use this callback to format the outgoing GraphQL
errors before they reach the client.

Returned result will be injected in the error message payload.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `message` | [`ErrorMessage`](common.ErrorMessage.md) |
| `errors` | readonly `GraphQLError`[] |

##### Returns

`void` \| readonly `GraphQLError`[] \| `Promise`<`void` \| readonly `GraphQLError`[]\>

___

### onNext

• `Optional` **onNext**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`NextMessage`](common.NextMessage.md), `args`: `ExecutionArgs`, `result`: [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\>) => `void` \| [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\> \| `Promise`<`void` \| [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\>\>

#### Type declaration

▸ (`ctx`, `message`, `args`, `result`): `void` \| [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\> \| `Promise`<`void` \| [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\>\>

Executed after an operation has emitted a result right before
that result has been sent to the client. Results from both
single value and streaming operations will appear in this callback.

Use this callback if you want to format the execution result
before it reaches the client.

Returned result will be injected in the next message payload.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `message` | [`NextMessage`](common.NextMessage.md) |
| `args` | `ExecutionArgs` |
| `result` | [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\> |

##### Returns

`void` \| [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\> \| `Promise`<`void` \| [`ExecutionResult`](common.ExecutionResult.md)<`Record`<`string`, `unknown`\>, `Record`<`string`, `unknown`\>\> \| [`ExecutionPatchResult`](common.ExecutionPatchResult.md)<`unknown`, `Record`<`string`, `unknown`\>\>\>

___

### onOperation

• `Optional` **onOperation**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`SubscribeMessage`](common.SubscribeMessage.md), `args`: `ExecutionArgs`, `result`: [`OperationResult`](../modules/server.md#operationresult)) => `void` \| [`OperationResult`](../modules/server.md#operationresult) \| `Promise`<`void` \| [`OperationResult`](../modules/server.md#operationresult)\>

#### Type declaration

▸ (`ctx`, `message`, `args`, `result`): `void` \| [`OperationResult`](../modules/server.md#operationresult) \| `Promise`<`void` \| [`OperationResult`](../modules/server.md#operationresult)\>

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

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `message` | [`SubscribeMessage`](common.SubscribeMessage.md) |
| `args` | `ExecutionArgs` |
| `result` | [`OperationResult`](../modules/server.md#operationresult) |

##### Returns

`void` \| [`OperationResult`](../modules/server.md#operationresult) \| `Promise`<`void` \| [`OperationResult`](../modules/server.md#operationresult)\>

___

### onSubscribe

• `Optional` **onSubscribe**: (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`SubscribeMessage`](common.SubscribeMessage.md)) => `void` \| readonly `GraphQLError`[] \| `ExecutionArgs` \| `Promise`<`void` \| readonly `GraphQLError`[] \| `ExecutionArgs`\>

#### Type declaration

▸ (`ctx`, `message`): `void` \| readonly `GraphQLError`[] \| `ExecutionArgs` \| `Promise`<`void` \| readonly `GraphQLError`[] \| `ExecutionArgs`\>

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

##### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | [`Context`](server.Context.md)<`P`, `E`\> |
| `message` | [`SubscribeMessage`](common.SubscribeMessage.md) |

##### Returns

`void` \| readonly `GraphQLError`[] \| `ExecutionArgs` \| `Promise`<`void` \| readonly `GraphQLError`[] \| `ExecutionArgs`\>

___

### roots

• `Optional` **roots**: `Object`

The GraphQL root fields or resolvers to go
alongside the schema. Learn more about them
here: https://graphql.org/learn/execution/#root-fields-resolvers.

If you return from `onSubscribe`, and the returned value is
missing the `rootValue` field, the relevant operation root
will be used instead.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `mutation` | `undefined` \| `Record`<`string`, {}\> |
| `query` | `undefined` \| `Record`<`string`, {}\> |
| `subscription` | `undefined` \| `Record`<`string`, {}\> |

___

### schema

• `Optional` **schema**: `GraphQLSchema` \| (`ctx`: [`Context`](server.Context.md)<`P`, `E`\>, `message`: [`SubscribeMessage`](common.SubscribeMessage.md), `args`: `Omit`<`ExecutionArgs`, ``"schema"``\>) => `GraphQLSchema` \| `Promise`<`GraphQLSchema`\>

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

___

### subscribe

• `Optional` **subscribe**: (`args`: `ExecutionArgs`) => [`OperationResult`](../modules/server.md#operationresult)

#### Type declaration

▸ (`args`): [`OperationResult`](../modules/server.md#operationresult)

Is the `subscribe` function from GraphQL which is
used to execute the subscription operation.

Throwing an error from within this function will
close the socket with the `Error` message
in the close event reason.

##### Parameters

| Name | Type |
| :------ | :------ |
| `args` | `ExecutionArgs` |

##### Returns

[`OperationResult`](../modules/server.md#operationresult)

___

### validate

• `Optional` **validate**: (`schema`: `GraphQLSchema`, `documentAST`: `DocumentNode`, `rules?`: readonly `ValidationRule`[], `options?`: {}, `typeInfo?`: `TypeInfo`) => `ReadonlyArray`<`GraphQLError`\>

#### Type declaration

▸ (`schema`, `documentAST`, `rules?`, `options?`, `typeInfo?`): `ReadonlyArray`<`GraphQLError`\>

A custom GraphQL validate function allowing you to apply your
own validation rules.

Returned, non-empty, array of `GraphQLError`s will be communicated
to the client through the `ErrorMessage`. Use an empty array if the
document is valid and no errors have been encountered.

Will not be used when implementing a custom `onSubscribe`.

Throwing an error from within this function will close the socket
with the `Error` message in the close event reason.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `schema` | `GraphQLSchema` | - |
| `documentAST` | `DocumentNode` | - |
| `rules?` | readonly `ValidationRule`[] | - |
| `options?` | `Object` | - |
| `typeInfo?` | `TypeInfo` | **`Deprecated`** will be removed in 17.0.0 |

##### Returns

`ReadonlyArray`<`GraphQLError`\>
