---
'graphql-ws': patch
---

Drop `ExecutionPatchResult` and `FormattedExecutionPatchResult` types

Neither of the types are officially supported (yet) and the future versions of graphql-js adding support for stream/defer will a different signature for the incremental execution result.
