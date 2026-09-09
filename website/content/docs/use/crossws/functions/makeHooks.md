---
title: "Function: makeHooks() (use/crossws)"
sidebarTitle: "makeHooks"
description: "makeHooks, exported by graphql-ws/use/crossws."
---
> **makeHooks**\<`P`, `E`\>(`options`): `object`

Defined in: [src/use/crossws.ts:29](https://github.com/enisdenjo/graphql-ws/blob/master/src/use/crossws.ts#L29)

## Type Parameters

• **P** *extends* `undefined` \| `Record`\<`string`, `unknown`\> = `undefined` \| `Record`\<`string`, `unknown`\>

• **E** *extends* `Record`\<`PropertyKey`, `unknown`\> = `Record`\<`PropertyKey`, `never`\>

## Parameters

### options

[`ServerOptions`](/docs/server/interfaces/ServerOptions)\<`P`, [`Extra`](/docs/use/crossws/interfaces/Extra) & `Partial`\<`E`\>\> & `object`

## Returns

`object`

### close()

#### Parameters

##### peer

`Peer`

##### details

#### Returns

`void`

### error()

#### Parameters

##### peer

`Peer`

##### error

`WSError`

#### Returns

`void`

### message()

#### Parameters

##### peer

`Peer`

##### message

`Message`

#### Returns

`Promise`\<`void`\>

### open()

#### Parameters

##### peer

`Peer`

#### Returns

`void`
