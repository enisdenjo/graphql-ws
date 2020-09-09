[graphql-transport-ws](../README.md) › ["client"](../modules/_client_.md) › [ClientOptions](_client_.clientoptions.md)

# Interface: ClientOptions

Configuration used for the `create` client function.

## Hierarchy

* **ClientOptions**

## Index

### Properties

* [connectionParams](_client_.clientoptions.md#optional-connectionparams)
* [lazy](_client_.clientoptions.md#optional-lazy)
* [retryAttempts](_client_.clientoptions.md#optional-retryattempts)
* [retryTimeout](_client_.clientoptions.md#optional-retrytimeout)
* [url](_client_.clientoptions.md#url)

## Properties

### `Optional` connectionParams

• **connectionParams**? : *Record‹string, unknown› | function*

*Defined in [client.ts:26](https://github.com/enisdenjo/graphql-transport-ws/blob/1c0bdce/src/client.ts#L26)*

Optional parameters that the client specifies when establishing a connection with the server.

___

### `Optional` lazy

• **lazy**? : *undefined | false | true*

*Defined in [client.ts:32](https://github.com/enisdenjo/graphql-transport-ws/blob/1c0bdce/src/client.ts#L32)*

Should the connection be established immediately and persisted
or after the first listener subscribed.

**`default`** true

___

### `Optional` retryAttempts

• **retryAttempts**? : *undefined | number*

*Defined in [client.ts:37](https://github.com/enisdenjo/graphql-transport-ws/blob/1c0bdce/src/client.ts#L37)*

How many times should the client try to reconnect on abnormal socket closure before it errors out?

**`default`** 5

___

### `Optional` retryTimeout

• **retryTimeout**? : *undefined | number*

*Defined in [client.ts:42](https://github.com/enisdenjo/graphql-transport-ws/blob/1c0bdce/src/client.ts#L42)*

How long should the client wait until attempting to retry.

**`default`** 3 * 1000 (3 seconds)

___

###  url

• **url**: *string*

*Defined in [client.ts:24](https://github.com/enisdenjo/graphql-transport-ws/blob/1c0bdce/src/client.ts#L24)*

URL of the GraphQL server to connect.
