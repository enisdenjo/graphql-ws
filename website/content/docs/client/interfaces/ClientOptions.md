---
title: "Interface: ClientOptions<P> (client)"
sidebarTitle: "ClientOptions"
description: "ClientOptions (graphql-ws/client): Configuration used for the GraphQL over WebSocket client."
---
Defined in: [src/client.ts:201](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L201)

Configuration used for the GraphQL over WebSocket client.

## Type Parameters

• **P** *extends* [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage)\[`"payload"`\] = [`ConnectionInitMessage`](/docs/common/interfaces/ConnectionInitMessage)\[`"payload"`\]

## Properties

### connectionAckWaitTimeout?

> `optional` **connectionAckWaitTimeout**: `number`

Defined in: [src/client.ts:317](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L317)

The amount of time for which the client will wait
for `ConnectionAck` message.

Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.

If the wait timeout has passed and the server
has not responded with `ConnectionAck` message,
the client will terminate the socket by
dispatching a close event `4418: Connection acknowledgement timeout`

#### Default

```ts
0
```

***

### connectionParams?

> `optional` **connectionParams**: `P` \| () => `P` \| `Promise`\<`P`\>

Defined in: [src/client.ts:227](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L227)

Optional parameters, passed through the `payload` field with the `ConnectionInit` message,
that the client specifies when establishing a connection with the server. You can use this
for securely passing arguments for authentication.

If you decide to return a promise, keep in mind that the server might kick you off if it
takes too long to resolve! Check the `connectionInitWaitTimeout` on the server for more info.

Throwing an error from within this function will close the socket with the `Error` message
in the close event reason.

***

### disablePong?

> `optional` **disablePong**: `boolean`

Defined in: [src/client.ts:325](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L325)

Disable sending the `PongMessage` automatically.

Useful for when integrating your own custom client pinger that performs
custom actions before responding to a ping, or to pass along the optional pong
message payload. Please check the readme recipes for a concrete example.

***

### generateID()?

> `optional` **generateID**: (`payload`) => `string`

Defined in: [src/client.ts:396](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L396)

A custom ID generator for identifying subscriptions.

The default generates a v4 UUID to be used as the ID using `Math`
as the random number generator. Supply your own generator
in case you need more uniqueness.

Reference: https://gist.github.com/jed/982883

#### Parameters

##### payload

[`SubscribePayload`](/docs/common/interfaces/SubscribePayload)

#### Returns

`string`

***

### jsonMessageReplacer?

> `optional` **jsonMessageReplacer**: [`JSONMessageReplacer`](/docs/common/type-aliases/JSONMessageReplacer)

Defined in: [src/client.ts:408](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L408)

An optional override for the JSON.stringify function used to serialize
outgoing messages from this client. Useful for serializing custom
datatypes out to the client.

***

### jsonMessageReviver?

> `optional` **jsonMessageReviver**: [`JSONMessageReviver`](/docs/common/type-aliases/JSONMessageReviver)

Defined in: [src/client.ts:402](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L402)

An optional override for the JSON.parse function used to hydrate
incoming messages to this client. Useful for parsing custom datatypes
out of the incoming JSON.

***

### keepAlive?

> `optional` **keepAlive**: `number`

Defined in: [src/client.ts:303](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L303)

The timeout between dispatched keep-alive messages, namely server pings. Internally
dispatches the `PingMessage` type to the server and expects a `PongMessage` in response.
This helps with making sure that the connection with the server is alive and working.

Timeout countdown starts from the moment the socket was opened and subsequently
after every received `PongMessage`.

Note that NOTHING will happen automatically with the client if the server never
responds to a `PingMessage` with a `PongMessage`. If you want the connection to close,
you should implement your own logic on top of the client. A simple example looks like this:

```js
import { createClient } from 'graphql-ws';

let activeSocket, timedOut;
createClient({
  url: 'ws://i.time.out:4000/after-5/seconds',
  keepAlive: 10_000, // ping server every 10 seconds
  on: {
    connected: (socket) => (activeSocket = socket),
    ping: (received) => {
      if (!received) // sent
        timedOut = setTimeout(() => {
          if (activeSocket.readyState === WebSocket.OPEN)
            activeSocket.close(4408, 'Request Timeout');
        }, 5_000); // wait 5 seconds for the pong and then close the connection
    },
    pong: (received) => {
      if (received) clearTimeout(timedOut); // pong is received, clear connection close timeout
    },
  },
});
```

#### Default

```ts
0
```

***

### lazy?

> `optional` **lazy**: `boolean`

Defined in: [src/client.ts:237](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L237)

Controls when should the connection be established.

- `false`: Establish a connection immediately. Use `onNonLazyError` to handle errors.
- `true`: Establish a connection on first subscribe and close on last unsubscribe. Use
the subscription sink's `error` to handle errors.

#### Default

```ts
true
```

***

### lazyCloseTimeout?

> `optional` **lazyCloseTimeout**: `number`

Defined in: [src/client.ts:265](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L265)

How long should the client wait before closing the socket after the last operation has
completed. This is meant to be used in combination with `lazy`. You might want to have
a calmdown time before actually closing the connection. Kinda' like a lazy close "debounce".

#### Default

```ts
0
```

***

### on?

> `optional` **on**: `Partial`\<\{ `closed`: [`EventClosedListener`](/docs/client/type-aliases/EventClosedListener); `connected`: [`EventConnectedListener`](/docs/client/type-aliases/EventConnectedListener); `connecting`: [`EventConnectingListener`](/docs/client/type-aliases/EventConnectingListener); `error`: [`EventErrorListener`](/docs/client/type-aliases/EventErrorListener); `message`: [`EventMessageListener`](/docs/client/type-aliases/EventMessageListener); `opened`: [`EventOpenedListener`](/docs/client/type-aliases/EventOpenedListener); `ping`: [`EventPingListener`](/docs/client/type-aliases/EventPingListener); `pong`: [`EventPongListener`](/docs/client/type-aliases/EventPongListener); \}\>

Defined in: [src/client.ts:380](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L380)

Register listeners before initialising the client. This way
you can ensure to catch all client relevant emitted events.

The listeners passed in will **always** be the first ones
to get the emitted event before other registered listeners.

***

### onNonLazyError()?

> `optional` **onNonLazyError**: (`errorOrCloseEvent`) => `void`

Defined in: [src/client.ts:257](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L257)

Used ONLY when the client is in non-lazy mode (`lazy = false`). When
using this mode, the errors might have no sinks to report to; however,
to avoid swallowing errors, consider using `onNonLazyError`,  which will
be called when either:
- An unrecoverable error/close event occurs
- Silent retry attempts have been exceeded

After a client has errored out, it will NOT perform any automatic actions.

The argument can be a websocket `CloseEvent` or an `Error`. To avoid bundling
DOM types, you should derive and assert the correct type. When receiving:
- A `CloseEvent`: retry attempts have been exceeded or the specific
close event is labeled as fatal (read more in `retryAttempts`).
- An `Error`: some internal issue has occured, all internal errors are
fatal by nature.

#### Parameters

##### errorOrCloseEvent

`unknown`

#### Returns

`void`

#### Default

```ts
console.error
```

***

### retryAttempts?

> `optional` **retryAttempts**: `number`

Defined in: [src/client.ts:348](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L348)

How many times should the client try to reconnect on abnormal socket closure before it errors out?

The library classifies the following close events as fatal:
- _All internal WebSocket fatal close codes (check `isFatalInternalCloseCode` in `src/client.ts` for exact list)_
- `4500: Internal server error`
- `4005: Internal client error`
- `4400: Bad request`
- `4004: Bad response`
- `4401: Unauthorized` _tried subscribing before connect ack_
- `4406: Subprotocol not acceptable`
- `4409: Subscriber for <id> already exists` _distinction is very important_
- `4429: Too many initialisation requests`

In addition to the aforementioned close events, any _non-CloseEvent_ connection problem
is considered fatal by default. However, this specific behaviour can be altered by using
the `shouldRetry` option.

These events are reported immediately and the client will not reconnect.

#### Default

```ts
5
```

***

### retryWait()?

> `optional` **retryWait**: (`retries`) => `Promise`\<`void`\>

Defined in: [src/client.ts:357](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L357)

Control the wait time between retries. You may implement your own strategy
by timing the resolution of the returned promise with the retries count.
`retries` argument counts actual connection attempts, so it will begin with
0 after the first retryable disconnect.

#### Parameters

##### retries

`number`

#### Returns

`Promise`\<`void`\>

#### Default

```ts
'Randomised exponential backoff'
```

***

### shouldRetry()?

> `optional` **shouldRetry**: (`errOrCloseEvent`) => `boolean`

Defined in: [src/client.ts:372](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L372)

Check if the close event or connection error is fatal. If you return `false`,
the client will fail immediately without additional retries; however, if you
return `true`, the client will keep retrying until the `retryAttempts` have
been exceeded.

The argument is whatever has been thrown during the connection phase.

Beware, the library classifies a few close events as fatal regardless of
what is returned here. They are listed in the documentation of the `retryAttempts`
option.

#### Parameters

##### errOrCloseEvent

`unknown`

#### Returns

`boolean`

#### Default

'Only `CloseEvent`s'

***

### url

> **url**: `string` \| () => `string` \| `Promise`\<`string`\>

Defined in: [src/client.ts:215](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L215)

URL of the GraphQL over WebSocket Protocol compliant server to connect.

If the option is a function, it will be called on every WebSocket connection attempt.
Returning a promise is supported too and the connecting phase will stall until it
resolves with the URL.

A good use-case for having a function is when using the URL for authentication,
where subsequent reconnects (due to auth) may have a refreshed identity token in
the URL.

***

### webSocketImpl?

> `optional` **webSocketImpl**: `unknown`

Defined in: [src/client.ts:386](https://github.com/enisdenjo/graphql-ws/blob/master/src/client.ts#L386)

A custom WebSocket implementation to use instead of the
one provided by the global scope. Mostly useful for when
using the client outside of the browser environment.
