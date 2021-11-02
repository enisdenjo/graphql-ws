[graphql-ws](../README.md) / [use/uWebSockets](../modules/use_uWebSockets.md) / PersistedRequest

# Interface: PersistedRequest

[use/uWebSockets](../modules/use_uWebSockets.md).PersistedRequest

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds relevant values extracted from the uWS's request
while it is accessible.

## Table of contents

### Properties

- [headers](use_uWebSockets.PersistedRequest.md#headers)
- [method](use_uWebSockets.PersistedRequest.md#method)
- [query](use_uWebSockets.PersistedRequest.md#query)
- [url](use_uWebSockets.PersistedRequest.md#url)

## Properties

### headers

• **headers**: `IncomingHttpHeaders`

___

### method

• **method**: `string`

___

### query

• **query**: `string`

The raw query string (after the `?` sign) or empty string.

___

### url

• **url**: `string`
