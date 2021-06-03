[graphql-ws](../README.md) / [use/uWebSockets](../modules/use_uwebsockets.md) / Extra

# Interface: Extra

[use/uWebSockets](../modules/use_uwebsockets.md).Extra

The extra that will be put in the `Context`.

## Hierarchy

- [UpgradeData](use_uwebsockets.upgradedata.md)

  ↳ **Extra**

## Table of contents

### Properties

- [persistedRequest](use_uwebsockets.extra.md#persistedrequest)
- [request](use_uwebsockets.extra.md#request)
- [socket](use_uwebsockets.extra.md#socket)

## Properties

### persistedRequest

• `Readonly` **persistedRequest**: [PersistedRequest](use_uwebsockets.persistedrequest.md)

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds the relevant values extracted from the uWS's request
while it is accessible.

#### Inherited from

[UpgradeData](use_uwebsockets.upgradedata.md).[persistedRequest](use_uwebsockets.upgradedata.md#persistedrequest)

___

### request

• `Readonly` **request**: `HttpRequest`

The initial HTTP request before the actual
socket and connection is established.

**`deprecated`** uWS.HttpRequest is stack allocated and cannot be accessed outside the internal `upgrade` callback. Consider using the `persistedRequest` instead.

#### Inherited from

[UpgradeData](use_uwebsockets.upgradedata.md).[request](use_uwebsockets.upgradedata.md#request)

___

### socket

• `Readonly` **socket**: `WebSocket` & [UpgradeData](use_uwebsockets.upgradedata.md)

The actual socket connection between the server and the client
with the upgrade data.
