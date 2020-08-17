[@enisdenjo/graphql-transport-ws](../README.md) › ["client"](../modules/_client_.md) › [ClientOptions](_client_.clientoptions.md)

# Interface: ClientOptions

Configuration used for the `create` client function.

## Hierarchy

* **ClientOptions**

## Index

### Properties

* [connectionParams](_client_.clientoptions.md#optional-connectionparams)
* [url](_client_.clientoptions.md#url)

## Properties

### `Optional` connectionParams

• **connectionParams**? : *Record‹string, unknown› | function*

*Defined in [client.ts:25](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/client.ts#L25)*

Optional parameters that the client specifies when establishing a connection with the server.

___

###  url

• **url**: *string*

*Defined in [client.ts:23](https://github.com/enisdenjo/graphql-transport-ws/blob/eca7681/src/client.ts#L23)*

URL of the GraphQL server to connect.
