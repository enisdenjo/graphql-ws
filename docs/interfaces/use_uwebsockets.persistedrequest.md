[graphql-ws](../README.md) / [use/uWebSockets](../modules/use_uwebsockets.md) / PersistedRequest

# Interface: PersistedRequest

[use/uWebSockets](../modules/use_uwebsockets.md).PersistedRequest

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds relevant values extracted from the uWS's request
while it is accessible.

## Table of contents

### Properties

- [headers](use_uwebsockets.persistedrequest.md#headers)
- [method](use_uwebsockets.persistedrequest.md#method)
- [query](use_uwebsockets.persistedrequest.md#query)
- [url](use_uwebsockets.persistedrequest.md#url)

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
