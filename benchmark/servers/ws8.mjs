import { WebSocketServer } from 'ws';
import { WS_PORT } from './ports.mjs';
import { useServer } from '../../lib/use/ws.mjs';
import { schema } from './schema.mjs';

const server = new WebSocketServer({
  port: WS_PORT,
  path: '/graphql',
});

useServer({ schema }, server);

console.log(`ws8 - listening on port ${WS_PORT}...`);
