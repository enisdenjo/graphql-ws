import http from 'http';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  subscribe,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { Disposable } from '../types';
import { createServer } from '../server';
import { GRAPHQL_WS_PROTOCOL } from '../protocol';

import WebSocket from 'ws';
Object.assign(global, {
  WebSocket: WebSocket, // for the client
});

const pubsub = new PubSub();

const personType = new GraphQLObjectType({
  name: 'Person',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      testString: { type: GraphQLString, resolve: () => 'value' },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      person: {
        type: personType,
        args: {
          id: { type: GraphQLString },
        },
        subscribe: () => {
          return pubsub.asyncIterator('person');
        },
      },
    },
  }),
});

const port = 8273,
  path = '/graphql',
  url = `ws://localhost:${port}${path}`;

let server: Disposable | undefined, httpServer: http.Server | undefined;
async function getServer() {
  if (server) {
    return server;
  }
  httpServer = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  server = await createServer(
    {
      schema,
      subscribe,
    },
    {
      server: httpServer,
      path,
    },
  );
  return new Promise<Disposable>((resolve) =>
    httpServer!.listen(port, () => resolve(server)),
  );
}
afterEach((done) => {
  if (server && httpServer) {
    server.dispose().then(() => {
      httpServer!.close(() => {
        server = undefined;
        httpServer = undefined;
        done();
      });
    });
  }
});

it('should allow connections with valid protocols only', async (done) => {
  expect.assertions(4);

  await getServer();

  let client = new WebSocket(url);
  client.onclose = (event) => {
    expect(event.code).toBe(1002); // 1002: Protocol error
  };

  client = new WebSocket(url, ['graphql', 'json']);
  client.onclose = (event) => {
    expect(event.code).toBe(1002); // 1002: Protocol error
  };

  client = new WebSocket(url, GRAPHQL_WS_PROTOCOL + 'gibberish');
  client.onclose = (event) => {
    expect(event.code).toBe(1002); // 1002: Protocol error
  };

  client = new WebSocket(url, GRAPHQL_WS_PROTOCOL);
  const closeFn = jest.fn();
  client.onclose = closeFn;
  setTimeout(() => {
    expect(closeFn).not.toBeCalled();
    done();
  }, 50);
});

it('should gracefully go away when disposing', async (done) => {
  expect.assertions(3);

  const server = await getServer();

  const errorFn = jest.fn();

  const client1 = new WebSocket(url, GRAPHQL_WS_PROTOCOL);
  client1.onerror = errorFn;
  client1.onclose = (event) => {
    expect(event.code).toBe(1001); // 1001: Going away
  };

  const client2 = new WebSocket(url, GRAPHQL_WS_PROTOCOL);
  client2.onerror = errorFn;
  client2.onclose = (event) => {
    expect(event.code).toBe(1001); // 1001: Going away
  };

  await server.dispose();
  setTimeout(() => {
    expect(errorFn).not.toBeCalled();
    done();
  }, 50);
});
