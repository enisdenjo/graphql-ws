[graphql-ws](../README.md) / [common](../modules/common.md) / ExecutionResult

# Interface: ExecutionResult<Data, Extensions\>

[common](../modules/common.md).ExecutionResult

## Type parameters

| Name | Type |
| :------ | :------ |
| `Data` | `Record`<`string`, `unknown`\> |
| `Extensions` | `Record`<`string`, `unknown`\> |

## Table of contents

### Properties

- [data](common.ExecutionResult.md#data)
- [errors](common.ExecutionResult.md#errors)
- [extensions](common.ExecutionResult.md#extensions)
- [hasNext](common.ExecutionResult.md#hasnext)

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

• `Optional` **hasNext**: `boolean`
