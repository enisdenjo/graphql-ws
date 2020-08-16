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
import {
  MessageType,
  parseMessage,
  stringifyMessage,
  Message,
} from '../message';

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testingServers.httpServer!.listen(port, () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

describe('onConnect', () => {
  it('should refuse connection and close socket if returning `false`', async () => {
    expect.assertions(3);

    await makeServer({
      onConnect: () => {
        return false;
      },
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4403);
      expect(event.reason).toBe('Forbidden');
      expect(event.wasClean).toBeTruthy();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await wait(10);
  });

  it('should close socket with error thrown from the callback', async () => {
    expect.assertions(3);

    const error = new Error("I'm a teapot");

    await makeServer({
      onConnect: () => {
        throw error;
      },
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4400);
      expect(event.reason).toBe(error.message);
      expect(event.wasClean).toBeTruthy();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await wait(10);
  });

  it('should acknowledge connection if not implemented or returning `true`', async () => {
    expect.assertions(2);

    function test() {
      const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
      client.onmessage = ({ data }) => {
        const message = parseMessage(data);
        expect(message.type).toBe(MessageType.ConnectionAck);
      };
      client.onopen = () => {
        client.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
          }),
        );
      };
    }

    // no implementation
    const server = await makeServer();
    test();
    await wait(10);
    await server.dispose();

    // returns true
    await makeServer({
      onConnect: () => {
        return true;
      },
    });
    test();
    await wait(10);
  });

  it('should pass in the `connectionParams` through the context and have other flags correctly set', async () => {
    expect.assertions(3);

    const connectionParams = {
      some: 'string',
      with: 'a',
      number: 10,
    };

    await makeServer({
      onConnect: (ctx) => {
        expect(ctx.connectionParams).toEqual(connectionParams);
        expect(ctx.connectionInitReceived).toBeTruthy(); // obviously received
        expect(ctx.acknowledged).toBeFalsy(); // not yet acknowledged
        return true;
      },
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
          payload: connectionParams,
        }),
      );
    };

    await wait(10);
  });

  it('should close the socket after the `connectionInitWaitTimeout` has passed without having received a `ConnectionInit` message', async () => {
    expect.assertions(3);

    await makeServer({ connectionInitWaitTimeout: 10 });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4408);
      expect(event.reason).toBe('Connection initialisation timeout');
      expect(event.wasClean).toBeTruthy();
    };

    await wait(20);
  });

  it('should not close the socket after the `connectionInitWaitTimeout` has passed but the callback is still resolving', async () => {
    expect.assertions(2);

    await makeServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 20)),
    });

    const closeFn = jest.fn();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = closeFn;
    client.onmessage = ({ data }) => {
      const message = parseMessage(data);
      expect(message.type).toBe(MessageType.ConnectionAck);
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await wait(30);

    expect(closeFn).not.toBeCalled();
  });
});

describe('Subscribe', () => {
  it('should close the socket on request if connection is not acknowledged', async () => {
    expect.assertions(3);

    await makeServer();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4401);
      expect(event.reason).toBe('Unauthorized');
      expect(event.wasClean).toBeTruthy();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.Subscribe>({
          id: '1',
          type: MessageType.Subscribe,
          payload: {
            operationName: 'NoAck',
            query: `subscription NoAck {}`,
            variables: {},
          },
        }),
      );
    };

    await wait(20);
  });

  it('should execute the query, "next" the result and then "complete"', async () => {
    expect.assertions(3);

    await makeServer({
      schema,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    let receivedNext = false;
    client.onmessage = ({ data }) => {
      const message = parseMessage(data);
      switch (message.type) {
        case MessageType.ConnectionAck:
          client.send(
            stringifyMessage<MessageType.Subscribe>({
              id: '1',
              type: MessageType.Subscribe,
              payload: {
                operationName: 'TestString',
                query: `query TestString {
                  testString
                }`,
                variables: {},
              },
            }),
          );
          break;
        case MessageType.Next:
          expect(message).toEqual({
            id: '1',
            type: MessageType.Next,
            payload: { data: { testString: 'value' } },
          });
          receivedNext = true;
          break;
        case MessageType.Complete:
          expect(receivedNext).toBeTruthy();
          expect(message).toEqual({
            id: '1',
            type: MessageType.Complete,
          });
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await wait(20);
  });

  it('should execute the query and "error" out because of validation errors', async () => {
    expect.assertions(8);

    await makeServer({
      schema,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    const closeOrErrorFn = jest.fn();
    client.onerror = closeOrErrorFn;
    client.onclose = closeOrErrorFn;
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };
    client.onmessage = ({ data }) => {
      const message = parseMessage(data);
      switch (message.type) {
        case MessageType.ConnectionAck:
          client.send(
            stringifyMessage<MessageType.Subscribe>({
              id: '1',
              type: MessageType.Subscribe,
              payload: {
                operationName: 'TestNoField',
                query: `query TestNoField {
                  testNumber
                  testBoolean
                }`,
                variables: {},
              },
            }),
          );
          break;
        case MessageType.Error:
          expect(message.id).toBe('1');
          expect(message.payload).toBeInstanceOf(Array);
          expect(message.payload.length).toBe(2);

          // testNumber
          expect(message.payload[0].message).toBe(
            'Cannot query field "testNumber" on type "Query".',
          );
          expect(message.payload[0].locations).toBeInstanceOf(Array);

          // testBoolean
          expect(message.payload[1].message).toBe(
            'Cannot query field "testBoolean" on type "Query".',
          );
          expect(message.payload[1].locations).toBeInstanceOf(Array);
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await wait(20);

    // socket shouldnt close or error because of GraphQL errors
    expect(closeOrErrorFn).not.toBeCalled();
  });
});
