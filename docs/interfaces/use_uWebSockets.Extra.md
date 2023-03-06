[graphql-ws](../README.md) / [use/uWebSockets](../modules/use_uWebSockets.md) / Extra

# Interface: Extra

[use/uWebSockets](../modules/use_uWebSockets.md).Extra

The extra that will be put in the `Context`.

## Hierarchy

- [`UpgradeData`](use_uWebSockets.UpgradeData.md)

  ↳ **`Extra`**

## Table of contents

### Properties

- [persistedRequest](use_uWebSockets.Extra.md#persistedrequest)
- [socket](use_uWebSockets.Extra.md#socket)

## Properties

### persistedRequest

• `Readonly` **persistedRequest**: [`PersistedRequest`](use_uWebSockets.PersistedRequest.md)

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds the relevant values extracted from the uWS's request
while it is accessible.

#### Inherited from

[UpgradeData](use_uWebSockets.UpgradeData.md).[persistedRequest](use_uWebSockets.UpgradeData.md#persistedrequest)

___

### socket

• `Readonly` **socket**: `WebSocket`<`unknown`\> & [`UpgradeData`](use_uWebSockets.UpgradeData.md)

The actual socket connection between the server and the client
with the upgrade data.
