[graphql-ws](../README.md) / ExecutionPatchResult

# Interface: ExecutionPatchResult<Data, Extensions\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `Data` | `unknown` |
| `Extensions` | `Record`<`string`, `unknown`\> |

## Table of contents

### Properties

- [data](ExecutionPatchResult.md#data)
- [errors](ExecutionPatchResult.md#errors)
- [extensions](ExecutionPatchResult.md#extensions)
- [hasNext](ExecutionPatchResult.md#hasnext)
- [label](ExecutionPatchResult.md#label)
- [path](ExecutionPatchResult.md#path)

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
