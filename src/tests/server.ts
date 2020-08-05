import http from 'http';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  subscribe,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { createServer, Server, ServerOptions } from '../server';
import { GRAPHQL_WS_PROTOCOL } from '../protocol';

/**
 * Test setup
 */

import WebSocket from 'ws';
Object.assign(global, {
  WebSocket: WebSocket, // for the client
});

/** Waits for the specified timeout and then resolves the promise. */
const wait = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

/**
 * GraphQL setup
 */

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

/**
 * Testing servers setup
 */

const port = 8273,
  path = '/testing-graphql',
  url = `ws://localhost:${port}${path}`;
const testingServers = {
  gqlServer: null as Server | null,
  httpServer: null as http.Server | null,
};

async function disposeExistingTestingServers() {
  await testingServers.gqlServer?.dispose();
  if (testingServers.httpServer) {
    await new Promise((resolve, reject) => {
      testingServers.httpServer!.close((err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }
  testingServers.gqlServer = null;
  testingServers.httpServer = null;
}
afterEach((done) => disposeExistingTestingServers().then(done));

async function makeServer(options: Partial<ServerOptions> = {}) {
  await disposeExistingTestingServers();
  testingServers.httpServer = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  testingServers.gqlServer = await createServer(
    {
      schema,
      subscribe,
      ...options,
    },
    {
      server: testingServers.httpServer,
      path,
    },
  );
  return new Promise<Server>((resolve) =>
    testingServers.httpServer!.listen(port, () =>
      resolve(testingServers.gqlServer!),
    ),
  );
}

/**
 * Tests
 */

it('should allow connections with valid protocols only', async (done) => {
  expect.assertions(4);

  await makeServer();

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
  expect.assertions(5);

  const server = await makeServer();

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

  await wait(50); // allow the connection to "calm down"

  await server.dispose();

  setTimeout(() => {
    expect(errorFn).toBeCalledTimes(0);
    expect(client1.readyState).toBe(WebSocket.CLOSED);
    expect(client2.readyState).toBe(WebSocket.CLOSED);
    done();
  }, 50);
});
