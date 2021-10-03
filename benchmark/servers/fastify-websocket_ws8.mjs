import Fastify from 'fastify';
import fastifyWebsocket from 'fastify-websocket';
import { ports } from './ports.mjs';
import { makeHandler } from '../../lib/use/fastify-websocket.mjs';
import { schema } from './schema.mjs';

const fastify = Fastify();
fastify.register(fastifyWebsocket);

fastify.get('/graphql', { websocket: true }, makeHandler({ schema }));

fastify.listen(ports['fastify-websocket_ws8'], (err) => {
  if (err) {
    fastify.log.error(err);
    return process.exit(1);
  }
  console.log(
    `fastify-websocket_ws8 - listening on port ${ports['fastify-websocket_ws8']}...`,
  );
});
