[graphql-transport-ws](../README.md) › ["client"](../modules/_client_.md) › [ClientOptions](_client_.clientoptions.md)

# Interface: ClientOptions

Configuration used for the `create` client function.

## Hierarchy

* **ClientOptions**

## Index

### Properties

* [connectionParams](_client_.clientoptions.md#optional-connectionparams)
* [lazy](_client_.clientoptions.md#optional-lazy)
* [on](_client_.clientoptions.md#optional-on)
* [retryAttempts](_client_.clientoptions.md#optional-retryattempts)
* [retryTimeout](_client_.clientoptions.md#optional-retrytimeout)
* [url](_client_.clientoptions.md#url)

## Properties

### `Optional` connectionParams

• **connectionParams**? : *Record‹string, unknown› | function*

*Defined in [client.ts:40](https://github.com/enisdenjo/graphql-transport-ws/blob/5b3d253/src/client.ts#L40)*

Optional parameters that the client specifies when establishing a connection with the server.

___

### `Optional` lazy

• **lazy**? : *undefined | false | true*

*Defined in [client.ts:46](https://github.com/enisdenjo/graphql-transport-ws/blob/5b3d253/src/client.ts#L46)*

Should the connection be established immediately and persisted
or after the first listener subscribed.

**`default`** true

___

### `Optional` on

• **on**? : *Partial‹object›*

*Defined in [client.ts:63](https://github.com/enisdenjo/graphql-transport-ws/blob/5b3d253/src/client.ts#L63)*

Register listeners before initialising the client. This way
you can ensure to catch all client relevant emitted events.
The listeners passed in will **always** be the first ones
to get the emitted event before other registered listeners.

___

### `Optional` retryAttempts

• **retryAttempts**? : *undefined | number*

*Defined in [client.ts:51](https://github.com/enisdenjo/graphql-transport-ws/blob/5b3d253/src/client.ts#L51)*

How many times should the client try to reconnect on abnormal socket closure before it errors out?

**`default`** 5

___

### `Optional` retryTimeout

• **retryTimeout**? : *undefined | number*

*Defined in [client.ts:56](https://github.com/enisdenjo/graphql-transport-ws/blob/5b3d253/src/client.ts#L56)*

How long should the client wait until attempting to retry.

**`default`** 3 * 1000 (3 seconds)

___

###  url

• **url**: *string*

*Defined in [client.ts:38](https://github.com/enisdenjo/graphql-transport-ws/blob/5b3d253/src/client.ts#L38)*

URL of the GraphQL server to connect.
