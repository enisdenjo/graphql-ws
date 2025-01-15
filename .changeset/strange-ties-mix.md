---
'graphql-ws': major
---

`schema`, `context`, `onSubscribe`, `onOperation`, `onError`, `onNext` and `onComplete` hooks don't have the full accompanying message anymore, only the ID and the relevant part from the message

There is really no need to pass the full `SubscribeMessage` to the `onSubscribe` hook. The only relevant parts from the message are the `id` and the `payload`, the `type` is useless since the hook inherently has it (`onNext` is `next` type, `onError` is `error` type, etc).

The actual techincal reason for not having the full message is to avoid serialising results and errors twice. Both `onNext` and `onError` allow the user to augment the result and return it to be used instead. `onNext` originally had the `NextMessage` argument which already has the `FormattedExecutionResult`, and `onError` originally had the `ErrorMessage` argument which already has the `GraphQLFormattedError`, and they both also returned `FormattedExecutionResult` and `GraphQLFormattedError` respectivelly - meaning, if the user serialised the results - the serialisation would happen **twice**.

Additionally, the `onOperation`, `onError`, `onNext` and `onComplete` now have the `payload` which is the `SubscribeMessage.payload` (`SubscribePayload`) for easier access to the original query as well as execution params extensions.

### Migrating from v5 to v6

#### `schema`

```diff
import { ExecutionArgs } from 'graphql';
import { ServerOptions, SubscribePayload } from 'graphql-ws';

const opts: ServerOptions = {
- schema(ctx, message, argsWithoutSchema: Omit<ExecutionArgs, 'schema'>) {
-   const messageId = message.id;
-   const messagePayload: SubscribePayload = message.payload;
- },
+ schema(ctx, id, payload) {
+   const messageId = id;
+   const messagePayload: SubscribePayload = payload;
+ },
};
```

#### `context`

```diff
import { ExecutionArgs } from 'graphql';
import { ServerOptions, SubscribePayload } from 'graphql-ws';

const opts: ServerOptions = {
- context(ctx, message, args: ExecutionArgs) {
-   const messageId = message.id;
-   const messagePayload: SubscribePayload = message.payload;
- },
+ context(ctx, id, payload, args: ExecutionArgs) {
+   const messageId = id;
+   const messagePayload: SubscribePayload = payload;
+ },
};
```

#### `onSubscribe`

```diff
import { ServerOptions, SubscribePayload } from 'graphql-ws';

const opts: ServerOptions = {
- onSubscribe(ctx, message) {
-   const messageId = message.id;
-   const messagePayload: SubscribePayload = message.payload;
- },
+ onSubscribe(ctx, id, payload) {
+   const messageId = id;
+   const messagePayload: SubscribePayload = payload;
+ },
};
```

#### `onOperation`

The `SubscribeMessage.payload` is not useful here at all, the `payload` has been parsed to ready-to-use graphql execution args and should be used instead.

```diff
import { ExecutionArgs } from 'graphql';
import { ServerOptions, SubscribePayload, OperationResult } from 'graphql-ws';

const opts: ServerOptions = {
- onOperation(ctx, message, args: ExecutionArgs, result: OperationResult) {
-   const messageId = message.id;
-   const messagePayload: SubscribePayload = message.payload;
- },
+ onOperation(ctx, id, payload, args: ExecutionArgs, result: OperationResult) {
+   const messageId = id;
+   const messagePayload: SubscribePayload = payload;
+ },
};
```

#### `onError`

The `ErrorMessage.payload` (`GraphQLFormattedError[]`) is not useful here at all, the user has access to `GraphQLError[]` that are true instances of the error containing object references to `originalError`s and other properties. The user can always convert and return `GraphQLFormattedError[]` by using the `.toJSON()` method.

```diff
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { ServerOptions, SubscribePayload } from 'graphql-ws';

const opts: ServerOptions = {
- onError(ctx, message, errors) {
-   const messageId = message.id;
-   const graphqlErrors: readonly GraphQLError[] = errors;
-   const errorMessagePayload: readonly GraphQLFormattedError[] = message.payload;
- },
+ onError(ctx, id, payload, errors) {
+   const messageId = id;
+   const graphqlErrors: readonly GraphQLError[] = errors;
+   const subscribeMessagePayload: SubscribePayload = payload;
+   const errorMessagePayload: readonly GraphQLFormattedError[] = errors.map((e) => e.toJSON());
+ },
};
```

#### `onNext`

The `NextMessage.payload` (`FormattedExecutionResult`) is not useful here at all, the user has access to `ExecutionResult` that contains actual object references to error instances. The user can always convert and return `FormattedExecutionResult` by serialising the errors with `GraphQLError.toJSON()` method.

```diff
import { ExecutionArgs, ExecutionResult, FormattedExecutionResult } from 'graphql';
import { ServerOptions, SubscribePayload } from 'graphql-ws';

const opts: ServerOptions = {
- onNext(ctx, message, args: ExecutionArgs, result: ExecutionResult) {
-   const messageId = message.id;
-   const nextMessagePayload: FormattedExecutionResult = message.payload;
- },
+ onNext(ctx, id, payload, args: ExecutionArgs, result: ExecutionResult) {
+   const messageId = id;
+   const subscribeMessagePayload: SubscribePayload = payload;
+   const nextMessagePayload: FormattedExecutionResult = { ...result, errors: result.errors?.map((e) => e.toJSON()) };
+ },
};
```

#### `onComplete`

```diff
import { ServerOptions, SubscribePayload } from 'graphql-ws';

const opts: ServerOptions = {
- onComplete(ctx, message) {
-   const messageId = message.id;
- },
+ onComplete(ctx, id, payload) {
+   const messageId = id;
+   const subscribeMessagePayload: SubscribePayload = payload;
+ },
};
```
