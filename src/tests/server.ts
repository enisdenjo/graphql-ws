import http from 'http';
import WebSocket from 'ws';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  execute,
  subscribe,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { createServer, Server, ServerOptions } from '../server';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../protocol';

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
      execute,
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

it('should allow connections with valid protocols only', async () => {
  expect.assertions(10);

  await makeServer();

  let client = new WebSocket(url);
  client.onclose = (event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  };

  await wait(5);

  client = new WebSocket(url, ['graphql', 'json']);
  client.onclose = (event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  };

  await wait(5);

  client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL + 'gibberish');
  client.onclose = (event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  };

  await wait(5);

  client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  const closeFn = jest.fn();
  client.onclose = closeFn;

  await wait(10);

  expect(closeFn).not.toBeCalled();
});

it('should gracefully go away when disposing', async () => {
  expect.assertions(9);

  const server = await makeServer();

  const errorFn = jest.fn();

  const client1 = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client1.onerror = errorFn;
  client1.onclose = (event) => {
    expect(event.code).toBe(1001);
    expect(event.reason).toBe('Going away');
    expect(event.wasClean).toBeTruthy();
  };

  const client2 = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client2.onerror = errorFn;
  client2.onclose = (event) => {
    expect(event.code).toBe(1001);
    expect(event.reason).toBe('Going away');
    expect(event.wasClean).toBeTruthy();
  };

  await wait(10);

  await server.dispose();

  await wait(10);

  expect(errorFn).not.toBeCalled();
  expect(client1.readyState).toBe(WebSocket.CLOSED);
  expect(client2.readyState).toBe(WebSocket.CLOSED);
});

it('should report server errors to clients by closing the connection', async () => {
  expect.assertions(3);

  const { webSocketServer } = await makeServer();

  const emittedError = new Error("I'm a teapot");

  const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client.onclose = (event) => {
    expect(event.code).toBe(1011); // 1011: Internal Error
    expect(event.reason).toBe(emittedError.message);
    expect(event.wasClean).toBeTruthy(); // because the server reported the error
  };

  await wait(10);

  webSocketServer.emit('error', emittedError);

  await wait(10);
});
