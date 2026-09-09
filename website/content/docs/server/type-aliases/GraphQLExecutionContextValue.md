---
title: "Type Alias: GraphQLExecutionContextValue (server)"
sidebarTitle: "GraphQLExecutionContextValue"
description: "GraphQLExecutionContextValue (graphql-ws/server): A concrete GraphQL execution context value type."
---
> **GraphQLExecutionContextValue**: `object` \| `symbol` \| `number` \| `string` \| `boolean` \| `undefined` \| `null`

Defined in: [src/server.ts:61](https://github.com/enisdenjo/graphql-ws/blob/master/src/server.ts#L61)

A concrete GraphQL execution context value type.

Mainly used because TypeScript collapses unions
with `any` or `unknown` to `any` or `unknown`. So,
we use a custom type to allow definitions such as
the `context` server option.
