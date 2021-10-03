import { WebSocketServer } from 'ws';
import { ports } from './ports.mjs';
import { useServer } from '../../lib/use/ws.mjs';
import { schema } from './schema.mjs';

const server = new WebSocketServer({
  port: ports.ws8,
  path: '/graphql',
});

useServer({ schema }, server);

console.log(`ws8 - listening on port ${ports.ws8}...`);
