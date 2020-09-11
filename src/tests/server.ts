import WebSocket from 'ws';
import { parse, buildSchema } from 'graphql';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../protocol';
import { MessageType, parseMessage, stringifyMessage } from '../message';
import { startServer, url, schema, pubsub } from './fixtures/simple';

/** Waits for the specified timeout and then resolves the promise. */
const wait = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

let dispose: (() => Promise<void>) | undefined;
async function makeServer(...args: Parameters<typeof startServer>) {
  let server;
  [server, dispose] = await startServer(...args);
  return [
    server,
    async () => {
      if (dispose) {
        await dispose();
        dispose = undefined;
      }
    },
  ] as [typeof server, typeof dispose];
}
afterEach(async () => {
  if (dispose) {
    await dispose();
    dispose = undefined;
  }
});

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

  await wait(5);
});

it('should gracefully go away when disposing', async () => {
  expect.assertions(9);

  const [, dispose] = await makeServer();

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

  await dispose();

  await wait(10);

  expect(errorFn).not.toBeCalled();
  expect(client1.readyState).toBe(WebSocket.CLOSED);
  expect(client2.readyState).toBe(WebSocket.CLOSED);
});

it('should report server errors to clients by closing the connection', async () => {
  expect.assertions(3);

  const [{ webSocketServer }] = await makeServer();

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
    const [, dispose] = await makeServer();
    test();
    await wait(10);
    await dispose();

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

  it('should close the socket on request if schema is left undefined', async () => {
    expect.assertions(3);

    await makeServer({
      schema: undefined,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(1011);
      expect(event.reason).toBe('The GraphQL schema is not provided');
      expect(event.wasClean).toBeTruthy();
    };
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
                operationName: 'TestString',
                query: `query TestString {
                  getValue
                }`,
                variables: {},
              },
            }),
          );
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await wait(10);
  });

  it('should pick up the schema from `onSubscribe`', async () => {
    expect.assertions(2);

    await makeServer({
      schema: undefined,
      onSubscribe: (_ctx, _message, args) => {
        return [
          {
            ...args,
            schema,
          },
        ];
      },
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
                operationName: 'TestString',
                query: `query TestString {
                  getValue
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
            payload: { data: { getValue: 'value' } },
          });
          break;
      }
    };

    await wait(20);

    expect(closeOrErrorFn).not.toBeCalled();
  });

  it('should execute the query of `string` type, "next" the result and then "complete"', async () => {
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
                  getValue
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
            payload: { data: { getValue: 'value' } },
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

  it('should execute the query of `DocumentNode` type, "next" the result and then "complete"', async () => {
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
                query: parse(`query TestString {
                  getValue
                }`),
                variables: {},
              },
            }),
          );
          break;
        case MessageType.Next:
          expect(message).toEqual({
            id: '1',
            type: MessageType.Next,
            payload: { data: { getValue: 'value' } },
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

  it('should execute the subscription and "next" the published payload', async () => {
    expect.assertions(1);

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

    client.onmessage = ({ data }) => {
      const message = parseMessage(data);
      switch (message.type) {
        case MessageType.ConnectionAck: {
          client.send(
            stringifyMessage<MessageType.Subscribe>({
              id: '1',
              type: MessageType.Subscribe,
              payload: {
                operationName: 'BecomingHappy',
                query: `subscription BecomingHappy {
                  becameHappy(secret: "smile more") {
                    name
                  }
                }`,
              },
            }),
            () =>
              setTimeout(
                () =>
                  pubsub.publish('becameHappy', {
                    becameHappy: {
                      name: 'john',
                    },
                  }),
                0,
              ),
          );
          break;
        }
        case MessageType.Next:
          expect(message).toEqual({
            id: '1',
            type: MessageType.Next,
            payload: { data: { becameHappy: { name: 'john' } } },
          });
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await wait(20);
  });

  it('should stop dispatching messages after completing a subscription', async () => {
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

    const onMessageFn = jest.fn(({ data }) => {
      const message = parseMessage(data);
      if (message.type === MessageType.ConnectionAck) {
        client.send(
          stringifyMessage<MessageType.Subscribe>({
            id: '1',
            type: MessageType.Subscribe,
            payload: {
              query: `subscription {
              boughtBananas {
                name
              }
            }`,
            },
          }),
        );
      }
      return message;
    });
    client.onmessage = onMessageFn;
    await wait(10);

    pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'john',
      },
    });
    await wait(10);

    expect(onMessageFn.mock.results[1].value).toEqual({
      id: '1',
      type: MessageType.Next,
      payload: { data: { boughtBananas: { name: 'john' } } },
    });

    // complete
    client.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );
    await wait(10);

    // confirm complete
    expect(onMessageFn).toHaveLastReturnedWith({
      id: '1',
      type: MessageType.Complete,
    });

    pubsub.publish('boughtBananas', new Error('Something weird happened!'));
    await wait(10);

    pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'john',
      },
    });
    await wait(10);

    expect(onMessageFn).toBeCalledTimes(3); // ack, next, complete
  });
});

describe('keepAlive', () => {
  it('should dispatch pings after the timeout has passed', async () => {
    await makeServer({
      keepAlive: 50,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };
    await wait(10);

    const onPingFn = jest.fn();
    client.once('ping', onPingFn);
    await wait(50);

    expect(onPingFn).toBeCalled();
  });

  it('should not dispatch pings if disabled with nullish timeout', async () => {
    await makeServer({
      keepAlive: 0,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };
    await wait(10);

    const onPingFn = jest.fn();
    client.once('ping', onPingFn);
    await wait(50);

    expect(onPingFn).not.toBeCalled();
  });

  it('should terminate the socket if no pong is sent in response to a ping', async () => {
    expect.assertions(4);

    await makeServer({
      keepAlive: 50,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };
    await wait(10);

    // disable pong
    client.pong = () => {
      /**/
    };
    client.onclose = (event) => {
      // termination is not graceful or clean
      expect(event.code).toBe(1006);
      expect(event.wasClean).toBeFalsy();
    };

    const onPingFn = jest.fn();
    client.once('ping', onPingFn);
    await wait(50);

    expect(onPingFn).toBeCalled(); // ping is received

    await wait(50 + 10); // wait for the timeout to pass and termination to settle

    expect(client.readyState).toBe(WebSocket.CLOSED);
  });
});

it('should use the provided roots as resolvers', async () => {
  const schema = buildSchema(`
    type Query {
      hello: String
    }
    type Subscription {
      count: Int
    }
  `);

  const roots = {
    query: {
      hello: () => 'Hello World!',
    },
    subscription: {
      count: async function* () {
        for (const num of [1, 2, 3]) {
          yield num;
        }
      },
    },
  };

  await makeServer({
    schema,
    roots,
  });

  const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client.onopen = () => {
    client.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
  };
  await wait(10);

  await new Promise((resolve, reject) => {
    client.send(
      stringifyMessage<MessageType.Subscribe>({
        id: '1',
        type: MessageType.Subscribe,
        payload: {
          query: `{ hello }`,
        },
      }),
    );
    client.on('message', function onMessage(data) {
      const message = parseMessage(data);
      switch (message.type) {
        case MessageType.Next:
          expect(message.type).toBe(MessageType.Next);
          expect(message.payload).toEqual({ data: { hello: 'Hello World!' } });
          break;
        case MessageType.Error:
          client.off('message', onMessage);
          return reject();
        case MessageType.Complete:
          client.off('message', onMessage);
          return resolve();
      }
    });
  });

  const nextFn = jest.fn();
  await new Promise((resolve, reject) => {
    client.send(
      stringifyMessage<MessageType.Subscribe>({
        id: '2',
        type: MessageType.Subscribe,
        payload: {
          query: `subscription { count }`,
        },
      }),
    );
    client.on('message', function onMessage(data) {
      const message = parseMessage(data);
      switch (message.type) {
        case MessageType.Next:
          nextFn();
          break;
        case MessageType.Error:
          client.off('message', onMessage);
          return reject(message.payload);
        case MessageType.Complete:
          client.off('message', onMessage);
          return resolve();
      }
    });
  });
  expect(nextFn).toBeCalledTimes(3);
});
