---
'graphql-ws': patch
---

Remove uWebSockets.js from peer dependencies in package.json

It does not exist on NPM anymore and could lead to weird behavior when installing dependencies with `npm`. Nothing else changes, using `graphql-ws` with uWebSockets.js still works.
