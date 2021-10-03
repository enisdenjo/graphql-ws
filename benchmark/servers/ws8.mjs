import { WebSocketServer } from 'ws';
import { WS8_PORT } from './ports.mjs';
import { useServer } from '../../lib/use/ws.mjs';
import { schema } from './schema.mjs';

const server = new WebSocketServer({
  port: WS8_PORT,
  path: '/graphql',
});

useServer({ schema }, server);

console.log(`ws8 - listening on port ${WS8_PORT}...`);
