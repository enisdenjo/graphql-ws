import ws from 'ws7';
import { WS7_PORT } from './ports.mjs';
import { useServer } from '../../lib/use/ws.mjs';
import { schema } from './schema.mjs';

const server = new ws.Server({
  port: WS7_PORT,
  path: '/graphql',
});

useServer({ schema }, server);

console.log(`ws7 - listening on port ${WS7_PORT}...`);
