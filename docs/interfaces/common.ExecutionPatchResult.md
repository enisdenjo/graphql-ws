[graphql-ws](../README.md) / [common](../modules/common.md) / ExecutionPatchResult

# Interface: ExecutionPatchResult<Data, Extensions\>

[common](../modules/common.md).ExecutionPatchResult

## Type parameters

| Name | Type |
| :------ | :------ |
| `Data` | `unknown` |
| `Extensions` | `Record`<`string`, `unknown`\> |

## Table of contents

### Properties

- [data](common.ExecutionPatchResult.md#data)
- [errors](common.ExecutionPatchResult.md#errors)
- [extensions](common.ExecutionPatchResult.md#extensions)
- [hasNext](common.ExecutionPatchResult.md#hasnext)
- [label](common.ExecutionPatchResult.md#label)
- [path](common.ExecutionPatchResult.md#path)

## Properties

### data

• `Optional` **data**: ``null`` \| `Data`

___

### errors

• `Optional` **errors**: readonly `GraphQLError`[]

___

### extensions

• `Optional` **extensions**: `Extensions`

___

### hasNext

• **hasNext**: `boolean`

___

### label

• `Optional` **label**: `string`

___

### path

• `Optional` **path**: readonly (`string` \| `number`)[]
