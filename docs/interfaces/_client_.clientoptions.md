**[graphql-ws](../README.md)**

> [Globals](../README.md) / ["client"](../modules/_client_.md) / ClientOptions

# Interface: ClientOptions

Configuration used for the GraphQL over WebSocket client.

## Hierarchy

* **ClientOptions**

## Index

### Properties

* [connectionParams](_client_.clientoptions.md#connectionparams)
* [generateID](_client_.clientoptions.md#generateid)
* [keepAlive](_client_.clientoptions.md#keepalive)
* [lazy](_client_.clientoptions.md#lazy)
* [on](_client_.clientoptions.md#on)
* [retryAttempts](_client_.clientoptions.md#retryattempts)
* [retryTimeout](_client_.clientoptions.md#retrytimeout)
* [url](_client_.clientoptions.md#url)
* [webSocketImpl](_client_.clientoptions.md#websocketimpl)

## Properties

### connectionParams

• `Optional` **connectionParams**: Record\<string, unknown> \| () => Promise\<Record\<string, unknown>> \| Record\<string, unknown>

Optional parameters, passed through the `payload` field with the `ConnectionInit` message,
that the client specifies when establishing a connection with the server. You can use this
for securely passing arguments for authentication.

If you decide to return a promise, keep in mind that the server might kick you off if it
takes too long to resolve! Check the `connectionInitWaitTimeout` on the server for more info.

Throwing an error from within this function will close the socket with the `Error` message
in the close event reason.

___

### generateID

• `Optional` **generateID**: undefined \| () => [ID](../modules/_types_.md#id)

A custom ID generator for identifying subscriptions.

The default generates a v4 UUID to be used as the ID using `Math`
as the random number generator. Supply your own generator
in case you need more uniqueness.

Reference: https://stackoverflow.com/a/2117523/709884

___

### keepAlive

• `Optional` **keepAlive**: undefined \| number

How long should the client wait before closing the socket after the last oparation has
completed. This is meant to be used in combination with `lazy`. You might want to have
a calmdown time before actually closing the connection. Kinda' like a lazy close "debounce".

**`default`** 0 // close immediately

___

### lazy

• `Optional` **lazy**: undefined \| false \| true

Should the connection be established immediately and persisted
or after the first listener subscribed.

**`default`** true

___

### on

• `Optional` **on**: Partial\<{}>

Register listeners before initialising the client. This way
you can ensure to catch all client relevant emitted events.

The listeners passed in will **always** be the first ones
to get the emitted event before other registered listeners.

___

### retryAttempts

• `Optional` **retryAttempts**: undefined \| number

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

### retryTimeout

• `Optional` **retryTimeout**: undefined \| number

How long should the client wait until attempting to retry.

**`default`** 3 * 1000 (3 seconds)

___

### url

•  **url**: string

URL of the GraphQL over WebSocket Protocol compliant server to connect.

___

### webSocketImpl

• `Optional` **webSocketImpl**: unknown

A custom WebSocket implementation to use instead of the
one provided by the global scope. Mostly useful for when
using the client outside of the browser environment.
