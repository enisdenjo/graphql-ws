[graphql-ws](../README.md) / [use/uWebSockets](../modules/use_uWebSockets.md) / UpgradeData

# Interface: UpgradeData

[use/uWebSockets](../modules/use_uWebSockets.md).UpgradeData

Data acquired during the HTTP upgrade callback from uWS.

## Hierarchy

- **`UpgradeData`**

  ↳ [`Extra`](use_uWebSockets.Extra.md)

## Table of contents

### Properties

- [persistedRequest](use_uWebSockets.UpgradeData.md#persistedrequest)

## Properties

### persistedRequest

• `Readonly` **persistedRequest**: [`PersistedRequest`](use_uWebSockets.PersistedRequest.md)

The initial HTTP upgrade request before the actual
socket and connection is established.

uWS's request is stack allocated and cannot be accessed
from outside of the internal upgrade; therefore, the persisted
request holds the relevant values extracted from the uWS's request
while it is accessible.
