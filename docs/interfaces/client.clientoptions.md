[graphql-ws](../README.md) / [client](../modules/client.md) / ClientOptions

# Interface: ClientOptions

[client](../modules/client.md).ClientOptions

Configuration used for the GraphQL over WebSocket client.

## Hierarchy

* **ClientOptions**

## Table of contents

### Properties

- [connectionParams](client.clientoptions.md#connectionparams)
- [generateID](client.clientoptions.md#generateid)
- [keepAlive](client.clientoptions.md#keepalive)
- [lazy](client.clientoptions.md#lazy)
- [on](client.clientoptions.md#on)
- [onNonLazyError](client.clientoptions.md#onnonlazyerror)
- [retryAttempts](client.clientoptions.md#retryattempts)
- [retryWait](client.clientoptions.md#retrywait)
- [url](client.clientoptions.md#url)
- [webSocketImpl](client.clientoptions.md#websocketimpl)

## Properties

### connectionParams

• `Optional` **connectionParams**: *undefined* \| *Record*<*string*, *unknown*\> \| () => *Record*<*string*, *unknown*\> \| *Promise*<*Record*<*string*, *unknown*\>\>

Optional parameters, passed through the `payload` field with the `ConnectionInit` message,
that the client specifies when establishing a connection with the server. You can use this
for securely passing arguments for authentication.

If you decide to return a promise, keep in mind that the server might kick you off if it
takes too long to resolve! Check the `connectionInitWaitTimeout` on the server for more info.

Throwing an error from within this function will close the socket with the `Error` message
in the close event reason.

___

### generateID

• `Optional` **generateID**: *undefined* \| () => *string*

A custom ID generator for identifying subscriptions.

The default generates a v4 UUID to be used as the ID using `Math`
as the random number generator. Supply your own generator
in case you need more uniqueness.

Reference: https://stackoverflow.com/a/2117523/709884

___

### keepAlive

• `Optional` **keepAlive**: *undefined* \| *number*

How long should the client wait before closing the socket after the last oparation has
completed. This is meant to be used in combination with `lazy`. You might want to have
a calmdown time before actually closing the connection. Kinda' like a lazy close "debounce".

**`default`** 0 // close immediately

___

### lazy

• `Optional` **lazy**: *undefined* \| *boolean*

Should the connection be established immediately and persisted
or after the first listener subscribed.

**`default`** true

___

### on

• `Optional` **on**: *undefined* \| *Partial*<{ `closed`: (`event`: *unknown*) => *void* ; `connected`: (`socket`: *unknown*, `payload?`: *Record*<*string*, *unknown*\>) => *void* ; `connecting`: () => *void*  }\>

Register listeners before initialising the client. This way
you can ensure to catch all client relevant emitted events.

The listeners passed in will **always** be the first ones
to get the emitted event before other registered listeners.

___

### onNonLazyError

• `Optional` **onNonLazyError**: *undefined* \| (`errorOrCloseEvent`: *unknown*) => *void*

Used ONLY when the client is in non-lazy mode (`lazy = false`). When
using this mode, the errors might have no sinks to report to; however,
to avoid swallowing errors, consider using `onNonLazyError`,  which will
be called when either:
- An unrecoverable error/close event occurs
- Silent retry attempts have been exceeded

After a client has errored out, it will NOT perform any automatic actions.

The argument can be a websocket `CloseEvent` or an `Error`. To avoid bundling
DOM types, you should derive and assert the correct type. When receiving:
- A `CloseEvent`: retry attempts have been exceeded or the specific
close event is labeled as fatal (read more in `retryAttempts`).
- An `Error`: some internal issue has occured, all internal errors are
fatal by nature.

**`default`** console.error

___

### retryAttempts

• `Optional` **retryAttempts**: *undefined* \| *number*

How many times should the client try to reconnect on abnormal socket closure before it errors out?

The library classifies the following close events as fatal:
- `1002: Protocol Error`
- `1011: Internal Error`
- `4400: Bad Request`
- `4401: Unauthorized` _tried subscribing before connect ack_
- `4409: Subscriber for <id> already exists` _distinction is very important_
- `4429: Too many initialisation requests`

These events are reported immediately and the client will not reconnect.

**`default`** 5

___

### retryWait

• `Optional` **retryWait**: *undefined* \| (`retries`: *number*) => *Promise*<*void*\>

Control the wait time between retries. You may implement your own strategy
by timing the resolution of the returned promise with the retries count.
`retries` argument counts actual connection attempts, so it will begin with
0 after the first retryable disconnect.

**`default`** Randomised exponential backoff

___

### url

• **url**: *string*

URL of the GraphQL over WebSocket Protocol compliant server to connect.

___

### webSocketImpl

• `Optional` **webSocketImpl**: *unknown*

A custom WebSocket implementation to use instead of the
one provided by the global scope. Mostly useful for when
using the client outside of the browser environment.
