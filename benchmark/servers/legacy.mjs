import { createServer } from 'http';
import { LEGACY_PORT } from './ports.mjs';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { schema } from './schema.mjs';

const server = createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});

SubscriptionServer.create(
  {
    schema,
    execute: (
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
    ) =>
      execute({
        schema,
        document,
        rootValue,
        contextValue,
        variableValues,
        operationName,
      }),
    subscribe: (
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
    ) =>
      subscribe({
        schema,
        document,
        rootValue,
        contextValue,
        variableValues,
        operationName,
      }),
  },
  { server, path: '/graphql' },
);

server.listen(LEGACY_PORT, () => {
  console.log(`legacy_ws7 - listening on port ${LEGACY_PORT}...`);
});
