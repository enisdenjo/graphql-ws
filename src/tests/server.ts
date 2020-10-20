import WebSocket from 'ws';
import { parse, buildSchema, execute, subscribe } from 'graphql';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../protocol';
import { MessageType, parseMessage, stringifyMessage } from '../message';
import { startServer, url, schema, pubsub } from './fixtures/simple';

let forgottenDispose: (() => Promise<void>) | undefined;
async function makeServer(
  ...args: Parameters<typeof startServer>
): ReturnType<typeof startServer> {
  const [server, dispose] = await startServer(...args);
  forgottenDispose = dispose;
  return [
    server,
    async (beNice) => {
      await dispose(beNice);
      forgottenDispose = undefined;
    },
  ];
}
afterEach(async () => {
  // if not disposed manually
  if (forgottenDispose) {
    await forgottenDispose();
    forgottenDispose = undefined;
  }
});

function createTClient(
  protocols: string | string[] = GRAPHQL_TRANSPORT_WS_PROTOCOL,
) {
  let closeEvent: WebSocket.CloseEvent;
  const queue: WebSocket.MessageEvent[] = [];
  return new Promise<{
    ws: WebSocket;
    waitForMessage: (
      test: (data: WebSocket.MessageEvent) => void,
      expire?: number,
    ) => Promise<void>;
    waitForClose: (
      test?: (event: WebSocket.CloseEvent) => void,
      expire?: number,
    ) => Promise<void>;
  }>((resolve) => {
    const ws = new WebSocket(url, protocols);
    ws.onclose = (event) => (closeEvent = event); // just so that none are missed
    ws.onmessage = (message) => queue.push(message); // guarantee message delivery with a queue
    ws.once('open', () =>
      resolve({
        ws,
        async waitForMessage(test, expire) {
          return new Promise((resolve) => {
            const done = () => {
              // the onmessage listener above will be called before our listener, populating the queue
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              test(queue.shift()!);
              resolve();
            };
            if (queue.length > 0) {
              return done();
            }
            ws.once('message', done);
            if (expire) {
              setTimeout(() => {
                ws.removeListener('message', done); // expired
                resolve();
              }, expire);
            }
          });
        },
        async waitForClose(
          test?: (event: WebSocket.CloseEvent) => void,
          expire?: number,
        ) {
          return new Promise((resolve) => {
            if (closeEvent) {
              if (test) test(closeEvent);
              return resolve();
            }
            ws.onclose = (event) => {
              closeEvent = event;
              if (test) test(event);
              resolve();
            };
            if (expire) {
              setTimeout(() => {
                // @ts-expect-error: its ok
                ws.onclose = null; // expired
                resolve();
              }, expire);
            }
          });
        },
      }),
    );
  });
}

/**
 * Tests
 */

it('should allow connections with valid protocols only', async () => {
  await makeServer();

  let client = await createTClient('');
  await client.waitForClose((event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  });

  client = await createTClient(['graphql', 'json']);
  await client.waitForClose((event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  });

  client = await createTClient(GRAPHQL_TRANSPORT_WS_PROTOCOL + 'gibberish');
  await client.waitForClose((event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  });

  client = await createTClient(GRAPHQL_TRANSPORT_WS_PROTOCOL);
  await client.waitForClose(
    () => fail('shouldnt close for valid protocol'),
    100, // should be kicked off within this time
  );
});

it('should gracefully go away when disposing', async () => {
  const [, dispose] = await makeServer();

  const client1 = await createTClient();
  const client2 = await createTClient();

  await dispose(true);

  await client1.waitForClose((event) => {
    expect(event.code).toBe(1001);
    expect(event.reason).toBe('Going away');
    expect(event.wasClean).toBeTruthy();
  });
  await client2.waitForClose((event) => {
    expect(event.code).toBe(1001);
    expect(event.reason).toBe('Going away');
    expect(event.wasClean).toBeTruthy();
  });
});

it('should report server errors to clients by closing the connection', async () => {
  const [{ webSocketServer }] = await makeServer();

  const client = await createTClient();

  const emittedError = new Error("I'm a teapot");
  webSocketServer.emit('error', emittedError);

  await client.waitForClose((event) => {
    expect(event.code).toBe(1011); // 1011: Internal Error
    expect(event.reason).toBe(emittedError.message);
    expect(event.wasClean).toBeTruthy(); // because the server reported the error
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

  const client = await createTClient();
  client.ws.send(
    stringifyMessage<MessageType.ConnectionInit>({
      type: MessageType.ConnectionInit,
    }),
  );
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
  });

  client.ws.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '1',
      type: MessageType.Subscribe,
      payload: {
        query: `{ hello }`,
      },
    }),
  );
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data)).toEqual({
      id: '1',
      type: MessageType.Next,
      payload: { data: { hello: 'Hello World!' } },
    });
  });
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data)).toEqual({
      id: '1',
      type: MessageType.Complete,
    });
  });

  client.ws.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '2',
      type: MessageType.Subscribe,
      payload: {
        query: `subscription { count }`,
      },
    }),
  );
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data).type).toBe(MessageType.Next);
  });
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data).type).toBe(MessageType.Next);
  });
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data).type).toBe(MessageType.Next);
  });
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data)).toEqual({
      id: '2',
      type: MessageType.Complete,
    });
  });
});

it('should pass in the context value from the config', async () => {
  const context = {};

  const executeFn = jest.fn((args) => execute(args));
  const subscribeFn = jest.fn((args) => subscribe(args));

  await makeServer({
    context,
    execute: executeFn,
    subscribe: subscribeFn,
  });

  const client = await createTClient();
  client.ws.send(
    stringifyMessage<MessageType.ConnectionInit>({
      type: MessageType.ConnectionInit,
    }),
  );
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
  });

  client.ws.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '1',
      type: MessageType.Subscribe,
      payload: {
        query: `{ getValue }`,
      },
    }),
  );
  await client.waitForMessage(({ data }) => {
    const message = parseMessage(data);
    expect(message.type).toBe(MessageType.Next);
    // @ts-expect-error it is next message
    expect(message.id).toBe('1');
  });
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data)).toEqual({
      id: '1',
      type: MessageType.Complete,
    });
  });

  expect(executeFn).toBeCalled();
  expect(executeFn.mock.calls[0][0].contextValue).toBe(context);

  client.ws.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '2',
      type: MessageType.Subscribe,
      payload: {
        query: `subscription { greetings }`,
      },
    }),
  );
  await client.waitForMessage(({ data }) => {
    const message = parseMessage(data);
    expect(message.type).toBe(MessageType.Next);
    // @ts-expect-error it is next message
    expect(message.id).toBe('2');
  });

  expect(subscribeFn).toBeCalled();
  expect(subscribeFn.mock.calls[0][0].contextValue).toBe(context);
});

describe('Connect', () => {
  it('should refuse connection and close socket if returning `false`', async () => {
    await makeServer({
      onConnect: () => {
        return false;
      },
    });

    const client = await createTClient();

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(4403);
      expect(event.reason).toBe('Forbidden');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should close socket with error thrown from the callback', async () => {
    const error = new Error("I'm a teapot");

    await makeServer({
      onConnect: () => {
        throw error;
      },
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(4400);
      expect(event.reason).toBe(error.message);
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should acknowledge connection if not implemented or returning `true`', async () => {
    async function test() {
      const client = await createTClient();
      client.ws.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
      await client.waitForMessage(({ data }) => {
        expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      });
    }

    // no implementation
    const [, dispose] = await makeServer();
    await test();

    await dispose();

    // returns true
    await makeServer({
      onConnect: () => {
        return true;
      },
    });
    await test();
  });

  it('should pass in the `connectionParams` through the context and have other flags correctly set', async (done) => {
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
        done();
        return true;
      },
    });

    (await createTClient()).ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
        payload: connectionParams,
      }),
    );
  });

  it('should close the socket after the `connectionInitWaitTimeout` has passed without having received a `ConnectionInit` message', async () => {
    await makeServer({ connectionInitWaitTimeout: 10 });

    await (await createTClient()).waitForClose((event) => {
      expect(event.code).toBe(4408);
      expect(event.reason).toBe('Connection initialisation timeout');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should not close the socket after the `connectionInitWaitTimeout` has passed but the callback is still resolving', async () => {
    await makeServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 20)),
    });

    const client = await createTClient();

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
    });

    await client.waitForClose(() => {
      fail('Shouldnt have closed');
    }, 100);
  });

  it('should close the socket if an additional `ConnectionInit` message is received while one is pending', async () => {
    await makeServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 50)),
    });

    const client = await createTClient();

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    // issue an additional one a bit later
    setTimeout(() => {
      client.ws.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    }, 10);

    await client.waitForClose((event) => {
      expect(event.code).toBe(4429);
      expect(event.reason).toBe('Too many initialisation requests');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should close the socket if more than one `ConnectionInit` message is received at any given time', async () => {
    await makeServer();

    const client = await createTClient();

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
    });

    // random connection init message even after acknowledgement
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(4429);
      expect(event.reason).toBe('Too many initialisation requests');
      expect(event.wasClean).toBeTruthy();
    });
  });
});

describe('Subscribe', () => {
  it('should close the socket on request if connection is not acknowledged', async () => {
    await makeServer();

    const client = await createTClient();

    client.ws.send(
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

    await client.waitForClose((event) => {
      expect(event.code).toBe(4401);
      expect(event.reason).toBe('Unauthorized');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should close the socket on request if schema is left undefined', async () => {
    await makeServer({
      schema: undefined,
    });

    const client = await createTClient();

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    await client.waitForClose((event) => {
      expect(event.code).toBe(1011);
      expect(event.reason).toBe('The GraphQL schema is not provided');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should pick up the schema from `onSubscribe`', async () => {
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

    const client = await createTClient();

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'value' } },
      });
    });

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 100);
  });

  it('should execute the query of `string` type, "next" the result and then "complete"', async () => {
    await makeServer({
      schema,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'value' } },
      });
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Complete,
      });
    });
  });

  it('should execute the live query, "next" multiple results and then "complete"', async () => {
    await makeServer({
      schema,
      execute: async function* () {
        for (const value of ['Hi', 'Hello', 'Sup']) {
          yield {
            data: {
              getValue: value,
            },
          };
        }
      },
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'Hi' } },
      });
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'Hello' } },
      });
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'Sup' } },
      });
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Complete,
      });
    });
  });

  it('should execute the query of `DocumentNode` type, "next" the result and then "complete"', async () => {
    await makeServer({
      schema,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'value' } },
      });
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Complete,
      });
    });
  });

  it('should execute the query and "error" out because of validation errors', async () => {
    await makeServer({
      schema,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Error,
        payload: [
          {
            locations: [
              {
                column: 15,
                line: 2,
              },
            ],
            message: 'Cannot query field "testNumber" on type "Query".',
          },
          {
            locations: [
              {
                column: 15,
                line: 3,
              },
            ],
            message: 'Cannot query field "testBoolean" on type "Query".',
          },
        ],
      });
    });

    await client.waitForClose(() => {
      fail('Shouldnt close because of GraphQL errors');
    }, 100);
  });

  it('should execute the subscription and "next" the published payload', async () => {
    await makeServer({
      schema,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
      );
    });

    setTimeout(() => {
      pubsub.publish('becameHappy', {
        becameHappy: {
          name: 'john',
        },
      });
    }, 0);

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { becameHappy: { name: 'john' } } },
      });
    });
  });

  it('should stop dispatching messages after completing a subscription', async () => {
    await makeServer({
      schema,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
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
    });

    setTimeout(() => {
      pubsub.publish('boughtBananas', {
        boughtBananas: {
          name: 'john',
        },
      });
    }, 0);

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { boughtBananas: { name: 'john' } } },
      });
    });

    // complete
    client.ws.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );

    // confirm complete
    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Complete,
      });
    });

    setTimeout(() => {
      pubsub.publish('boughtBananas', new Error('Something weird happened!'));
    }, 0);

    setTimeout(() => {
      pubsub.publish('boughtBananas', {
        boughtBananas: {
          name: 'john',
        },
      });
    }, 0);

    await client.waitForClose(() => {
      fail('Shouldnt have received a message');
    }, 100);
  });

  it('should close the socket on duplicate `subscription` operation subscriptions request', async () => {
    await makeServer();

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
      client.ws.send(
        stringifyMessage<MessageType.Subscribe>({
          id: 'not-unique',
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
    });

    // try subscribing with a live subscription id
    client.ws.send(
      stringifyMessage<MessageType.Subscribe>({
        id: 'not-unique',
        type: MessageType.Subscribe,
        payload: {
          query: `subscription {
            greetings
          }`,
        },
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(4409);
      expect(event.reason).toBe('Subscriber for not-unique already exists');
      expect(event.wasClean).toBeTruthy();
    });
  });
});

describe('Keep-Alive', () => {
  it('should dispatch pings after the timeout has passed', async (done) => {
    await makeServer({
      keepAlive: 50,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    client.ws.once('ping', () => done());
  });

  it('should not dispatch pings if disabled with nullish timeout', async (done) => {
    await makeServer({
      keepAlive: 0,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    client.ws.once('ping', () => fail('Shouldnt have pinged'));

    setTimeout(done, 50);
  });

  it('should terminate the socket if no pong is sent in response to a ping', async () => {
    await makeServer({
      keepAlive: 50,
    });

    const client = await createTClient();
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    // disable pong
    client.ws.pong = () => {
      /**/
    };

    // ping is received
    await new Promise((resolve) => client.ws.once('ping', resolve));

    // termination is not graceful or clean
    await client.waitForClose((event) => {
      expect(event.code).toBe(1006);
      expect(event.wasClean).toBeFalsy();
    });
  });
});
