---
title: "Function: stringifyMessage() (common)"
sidebarTitle: "stringifyMessage"
description: "stringifyMessage (graphql-ws/common): Stringifies a valid message ready to be sent through the socket."
---
> **stringifyMessage**\<`T`\>(`msg`, `replacer`?): `string`

Defined in: [src/common.ts:435](https://github.com/enisdenjo/graphql-ws/blob/master/src/common.ts#L435)

Stringifies a valid message ready to be sent through the socket.

## Type Parameters

• **T** *extends* [`MessageType`](/docs/common/enumerations/MessageType)

## Parameters

### msg

[`Message`](/docs/common/type-aliases/Message)\<`T`\>

### replacer?

[`JSONMessageReplacer`](/docs/common/type-aliases/JSONMessageReplacer)

## Returns

`string`
