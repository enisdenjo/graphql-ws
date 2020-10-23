**[graphql-transport-ws](../README.md)**

> [Globals](../README.md) / ["client"](../modules/_client_.md) / ClientOptions

# Interface: ClientOptions

Configuration used for the `create` client function.

## Hierarchy

* **ClientOptions**

## Index

### Properties

* [connectionParams](_client_.clientoptions.md#connectionparams)
* [generateID](_client_.clientoptions.md#generateid)
* [lazy](_client_.clientoptions.md#lazy)
* [on](_client_.clientoptions.md#on)
* [retryAttempts](_client_.clientoptions.md#retryattempts)
* [retryTimeout](_client_.clientoptions.md#retrytimeout)
* [url](_client_.clientoptions.md#url)
* [webSocketImpl](_client_.clientoptions.md#websocketimpl)

## Properties

### connectionParams

• `Optional` **connectionParams**: Record\<string, unknown> \| () => Record\<string, unknown>

Optional parameters that the client specifies when establishing a connection with the server.

___

### generateID

• `Optional` **generateID**: undefined \| () => [ID](../modules/_types_.md#id)

A custom ID generator for identifying subscriptions.
The default uses the `crypto` module in the global scope
which is present for modern browsers. However, if
it can't be found, `Math.random` would be used instead.

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

**`default`** 5

___

### retryTimeout

• `Optional` **retryTimeout**: undefined \| number

How long should the client wait until attempting to retry.

**`default`** 3 * 1000 (3 seconds)

___

### url

•  **url**: string

URL of the GraphQL server to connect.

___

### webSocketImpl

• `Optional` **webSocketImpl**: unknown

A custom WebSocket implementation to use instead of the
one provided by the global scope. Mostly useful for when
using the client outside of the browser environment.
