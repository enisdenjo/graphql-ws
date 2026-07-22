---
'graphql-ws': patch
---

Disposing of a client event listener twice no longer removes an unrelated listener

The unsubscribe function returned by `client.on` spliced at `indexOf(listener)` without checking for `-1`, so removing an already-removed listener would `splice(-1, 1)` and silently drop the most recently registered listener of the same event. This happens in practice without any double-dispose by the user: emits iterate over a copy of the listeners, so a one-shot internal listener that already unlistened itself during a nested emit (e.g. when `client.terminate()` is called from within a `closed`/`error` listener) is re-invoked from the copy and unlistens again, knocking out registered `closed`/`error` listeners.
