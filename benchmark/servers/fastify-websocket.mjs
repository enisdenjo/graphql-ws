import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { ports } from './ports.mjs';
import { makeHandler } from '../../lib/use/@fastify/websocket.mjs';
import { schema } from './schema.mjs';

const fastify = Fastify();
fastify.register(fastifyWebsocket);
fastify.register(async (fastify) => {
  fastify.get('/graphql', { websocket: true }, makeHandler({ schema }));
});

fastify.listen({ port: ports['@fastify/websocket'] }, (err) => {
  if (err) {
    fastify.log.error(err);
    return process.exit(1);
  }
  console.log(
    `@fastify/websocket - listening on port ${ports['@fastify/websocket']}...`,
  );
});
