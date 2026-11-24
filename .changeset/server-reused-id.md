---
'graphql-ws': patch
---

An operation that ends after the client completed it does not act on a new operation that re-uses its id

The client is free to re-use the id of a completed operation. The completed operation kept running, and when it ended it sent its own result and `complete` with the id, then removed the reservation of the new operation, whose result was never sent. Each operation now checks and removes only its own reservation.
