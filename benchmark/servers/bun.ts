/// <reference types="bun-types" />

import { schema } from './schema.mjs';
import { makeHandler } from '../../src/use/bun';
import { ports } from './ports.mjs';

Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return new Response();
    }
    return new Response(null, { status: 500 });
  },
  websocket: makeHandler({ schema }),
  port: ports.bun,
});

console.log(`bun - listening on port ${ports.bun}...`);
