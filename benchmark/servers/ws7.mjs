import ws from 'ws7';
const WebSocketServer = ws.Server;
import { ports } from './ports.mjs';
import { useServer } from '../../lib/use/ws.mjs';
import { schema } from './schema.mjs';

const server = new WebSocketServer({
  port: ports.ws7,
  path: '/graphql',
});

useServer({ schema }, server);

console.log(`ws7 - listening on port ${ports.ws7}...`);
