import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  execute,
  subscribe,
  GraphQLNonNull,
} from 'graphql';
import http from 'http';
import { PubSub } from 'graphql-subscriptions';
import { createServer, ServerOptions, Server } from '../../server';

export const pubsub = new PubSub();

const personType = new GraphQLObjectType({
  name: 'Person',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      getValue: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: () => 'value',
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      becameHappy: {
        type: personType,
        subscribe: () => {
          return pubsub.asyncIterator('becameHappy');
        },
      },
      boughtBananas: {
        type: personType,
        subscribe: () => {
          return pubsub.asyncIterator('boughtBananas');
        },
      },
    },
  }),
});

export const port = 8273,
  path = '/graphql-simple',
  url = `ws://localhost:${port}${path}`;

export async function startServer(
  options: Partial<ServerOptions> = {},
): Promise<[Server, () => Promise<void>]> {
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });

  const server = await createServer(
    {
      schema,
      execute,
      subscribe,
      ...options,
    },
    {
      server: httpServer,
      path,
    },
  );

  await new Promise((resolve) => httpServer.listen(port, resolve));

  return [
    server,
    () =>
      new Promise((resolve, reject) => {
        server
          .dispose()
          .catch(reject)
          .then(() => {
            httpServer.close((err) => (err ? reject(err) : resolve()));
          });
      }),
  ];
}
