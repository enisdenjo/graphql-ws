---
'graphql-ws': patch
---

Fix the server sending a `Complete` message after an `Error` message for subscriptions.

Previously, when a subscription's async iterable threw an error, the server would send:

```
{"id":"1","type":"error","payload":[{"message":"..."}]}
{"id":"1","type":"complete"}
```

Per the protocol spec:

> **Error:** This message terminates the operation and no further messages will be sent.

> **Complete (Server → Client):** If the server dispatched the `Error` message relative to the original `Subscribe` message, no `Complete` message will be emitted.

The server now correctly sends only the `Error` message:

```
{"id":"1","type":"error","payload":[{"message":"..."}]}
```

Clients that correctly follow the spec should be unaffected, as they are expected to ignore messages for operations they consider already completed.
