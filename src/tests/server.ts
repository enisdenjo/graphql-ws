import WebSocket from 'ws';
import {
  parse,
  buildSchema,
  execute,
  subscribe,
  GraphQLError,
  ExecutionArgs,
} from 'graphql';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../protocol';
import {
  MessageType,
  parseMessage,
  stringifyMessage,
  SubscribePayload,
} from '../message';
import { schema, startTServer } from './fixtures/simple';

function createTClient(
  url: string,
  protocols: string | string[] = GRAPHQL_TRANSPORT_WS_PROTOCOL,
) {
  let closeEvent: WebSocket.CloseEvent;
  const queue: WebSocket.MessageEvent[] = [];
  return new Promise<{
    ws: WebSocket;
    waitForMessage: (
      test?: (data: WebSocket.MessageEvent) => void,
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
              const next = queue.shift()!;
              test?.(next);
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
              test?.(closeEvent);
              return resolve();
            }
            ws.onclose = (event) => {
              closeEvent = event;
              test?.(event);
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
  const { url } = await startTServer();

  let client = await createTClient(url, '');
  await client.waitForClose((event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  });

  client = await createTClient(url, ['graphql', 'json']);
  await client.waitForClose((event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  });

  client = await createTClient(
    url,
    GRAPHQL_TRANSPORT_WS_PROTOCOL + 'gibberish',
  );
  await client.waitForClose((event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
  });

  client = await createTClient(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  await client.waitForClose(
    () => fail('shouldnt close for valid protocol'),
    30, // should be kicked off within this time
  );
});

it('should gracefully go away when disposing', async () => {
  const server = await startTServer();

  const client1 = await createTClient(server.url);
  const client2 = await createTClient(server.url);

  await server.dispose(true);

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
  const {
    url,
    server: { webSocketServer },
  } = await startTServer();

  const client = await createTClient(url);

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

  const { url } = await startTServer({
    schema,
    roots,
  });

  const client = await createTClient(url);
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

  const { url } = await startTServer({
    context,
    execute: executeFn,
    subscribe: subscribeFn,
  });

  const client = await createTClient(url);
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

it('should pass the `onSubscribe` exec args to the `context` option and use it', async (done) => {
  const context = {};
  const execArgs = {
    // no context here
    schema,
    document: parse(`query { getValue }`),
  };

  const { url } = await startTServer({
    onSubscribe: () => {
      return execArgs;
    },
    context: (_ctx, _msg, args) => {
      expect(args).toBe(args); // from `onSubscribe`
      return context; // will be injected
    },
    execute: (args) => {
      expect(args).toBe(execArgs); // from `onSubscribe`
      expect(args.contextValue).toBe(context); // injected by `context`
      done();
      return execute(args);
    },
    subscribe,
  });

  const client = await createTClient(url);
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
});

it('should prefer the `onSubscribe` context value even if `context` option is set', async (done) => {
  const context = 'not-me';
  const execArgs = {
    contextValue: 'me-me', // my custom context
    schema,
    document: parse(`query { getValue }`),
  };

  const { url } = await startTServer({
    onSubscribe: () => {
      return execArgs;
    },
    context, // should be ignored because there is one in `execArgs`
    execute: (args) => {
      expect(args).toBe(execArgs); // from `onSubscribe`
      expect(args.contextValue).not.toBe(context); // from `onSubscribe`
      done();
      return execute(args);
    },
    subscribe,
  });

  const client = await createTClient(url);
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
});

describe('Connect', () => {
  it('should refuse connection and close socket if returning `false`', async () => {
    const { url } = await startTServer({
      onConnect: () => {
        return false;
      },
    });

    const client = await createTClient(url);

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

    const { url } = await startTServer({
      onConnect: () => {
        throw error;
      },
    });

    const client = await createTClient(url);
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

  it('should acknowledge connection if not implemented, returning `true` or nothing', async () => {
    async function test(url: string) {
      const client = await createTClient(url);
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
    let server = await startTServer();
    await test(server.url);
    await server.dispose();

    // returns true
    server = await startTServer({
      onConnect: () => {
        return true;
      },
    });
    await test(server.url);
    await server.dispose();

    // returns nothing
    server = await startTServer({
      onConnect: () => {
        /**/
      },
    });
    await test(server.url);
  });

  it('should pass in the `connectionParams` through the context and have other flags correctly set', async (done) => {
    const connectionParams = {
      some: 'string',
      with: 'a',
      number: 10,
    };

    const { url } = await startTServer({
      onConnect: (ctx) => {
        expect(ctx.connectionParams).toEqual(connectionParams);
        expect(ctx.connectionInitReceived).toBeTruthy(); // obviously received
        expect(ctx.acknowledged).toBeFalsy(); // not yet acknowledged
        done();
        return true;
      },
    });

    (await createTClient(url)).ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
        payload: connectionParams,
      }),
    );
  });

  it('should close the socket after the `connectionInitWaitTimeout` has passed without having received a `ConnectionInit` message', async () => {
    const { url } = await startTServer({ connectionInitWaitTimeout: 10 });

    await (await createTClient(url)).waitForClose((event) => {
      expect(event.code).toBe(4408);
      expect(event.reason).toBe('Connection initialisation timeout');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should not close the socket after the `connectionInitWaitTimeout` has passed but the callback is still resolving', async () => {
    const { url } = await startTServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 20)),
    });

    const client = await createTClient(url);

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
    }, 30);
  });

  it('should close the socket if an additional `ConnectionInit` message is received while one is pending', async () => {
    const { url } = await startTServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 50)),
    });

    const client = await createTClient(url);

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
    const { url } = await startTServer();

    const client = await createTClient(url);

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
    const { url } = await startTServer();

    const client = await createTClient(url);

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
    const { url } = await startTServer({
      schema: undefined,
    });

    const client = await createTClient(url);

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

  it('should close the socket with errors thrown from any callback', async () => {
    const error = new Error('Stop');

    // onConnect
    let server = await startTServer({
      onConnect: () => {
        throw error;
      },
    });
    const client = await createTClient(server.url);
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
    await server.dispose();

    async function test(
      url: string,
      payload: SubscribePayload = {
        query: `query { getValue }`,
      },
    ) {
      const client = await createTClient(url);
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
            payload,
          }),
        );
      });

      await client.waitForClose((event) => {
        expect(event.code).toBe(4400);
        expect(event.reason).toBe(error.message);
        expect(event.wasClean).toBeTruthy();
      });
    }

    // onSubscribe
    server = await startTServer({
      onSubscribe: () => {
        throw error;
      },
    });
    await test(server.url);
    await server.dispose();

    server = await startTServer({
      onOperation: () => {
        throw error;
      },
    });
    await test(server.url);
    await server.dispose();

    // execute
    server = await startTServer({
      execute: () => {
        throw error;
      },
    });
    await test(server.url);
    await server.dispose();

    // subscribe
    server = await startTServer({
      subscribe: () => {
        throw error;
      },
    });
    await test(server.url, { query: 'subscription { greetings }' });
    await server.dispose();

    // onNext
    server = await startTServer({
      onNext: () => {
        throw error;
      },
    });
    await test(server.url);
    await server.dispose();

    // onError
    server = await startTServer({
      onError: () => {
        throw error;
      },
    });
    await test(server.url, { query: 'query { noExisto }' });
    await server.dispose();

    // onComplete
    server = await startTServer({
      onComplete: () => {
        throw error;
      },
    });
    await test(server.url);
    await server.dispose();
  });

  it('should directly use the execution arguments returned from `onSubscribe`', async () => {
    const nopeArgs = {
      schema,
      operationName: 'Nope',
      document: parse(`query Nope { getValue }`),
    };
    const { url } = await startTServer({
      schema: undefined,
      roots: {
        query: { not: 'me' },
      },
      execute: (args) => {
        expect(args.schema).toBe(nopeArgs.schema); // schema from nopeArgs
        expect(args.rootValue).toBeUndefined(); // nopeArgs didnt provide any root value
        expect(args.operationName).toBe('Nope');
        expect(args.variableValues).toBeUndefined(); // nopeArgs didnt provide variables
        return execute(args);
      },
      onSubscribe: (_ctx, _message) => {
        return nopeArgs;
      },
    });

    const client = await createTClient(url);

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
            operationName: 'Ping',
            query: `subscribe Ping {
              ping
            }`,
            variables: {},
          },
        }),
      );
    });

    // because onsubscribe changed the request

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { getValue: 'value' } },
      });
    });

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 30);
  });

  it('should report the graphql errors returned from `onSubscribe`', async () => {
    const { url } = await startTServer({
      onSubscribe: (_ctx, _message) => {
        return [new GraphQLError('Report'), new GraphQLError('Me')];
      },
    });

    const client = await createTClient(url);

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
            operationName: 'Ping',
            query: `subscribe Ping {
              ping
            }`,
            variables: {},
          },
        }),
      );
    });

    // because onsubscribe changed the request

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Error,
        payload: [{ message: 'Report' }, { message: 'Me' }],
      });
    });

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 30);
  });

  it('should use the execution result returned from `onNext`', async () => {
    const { url } = await startTServer({
      onNext: (_ctx, _message) => {
        return {
          data: { hey: 'there' },
        };
      },
    });

    const client = await createTClient(url);

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
              greetings
            }`,
            variables: {},
          },
        }),
      );
    });

    // because onnext changed the result

    for (let i = 0; i < 5; i++) {
      await client.waitForMessage(({ data }) => {
        expect(parseMessage(data)).toEqual({
          id: '1',
          type: MessageType.Next,
          payload: { data: { hey: 'there' } },
        });
      });
    }
    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Complete,
      });
    });

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 30);
  });

  it('should use the graphql errors returned from `onError`', async () => {
    const { url } = await startTServer({
      onError: (_ctx, _message) => {
        return [new GraphQLError('Itsa me!'), new GraphQLError('Anda me!')];
      },
    });

    const client = await createTClient(url);

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
            query: `query {
              nogql
            }`,
            variables: {},
          },
        }),
      );
    });

    // because onnext changed the result

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Error,
        payload: [{ message: 'Itsa me!' }, { message: 'Anda me!' }],
      });
    });

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 30);
  });

  it('should use the operation result returned from `onOperation`', async () => {
    const { url } = await startTServer({
      onOperation: (_ctx, _message) => {
        return (async function* () {
          for (let i = 0; i < 3; i++) {
            yield { data: { replaced: 'with me' } };
          }
        })();
      },
    });

    const client = await createTClient(url);

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
            query: `query {
              getValue
            }`,
            variables: {},
          },
        }),
      );
    });

    // because onoperation changed the execution result

    for (let i = 0; i < 3; i++) {
      await client.waitForMessage(({ data }) => {
        expect(parseMessage(data)).toEqual({
          id: '1',
          type: MessageType.Next,
          payload: { data: { replaced: 'with me' } },
        });
      });
    }

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 30);
  });

  it('should execute the query of `string` type, "next" the result and then "complete"', async () => {
    const { url } = await startTServer({
      schema,
    });

    const client = await createTClient(url);
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
    const { url } = await startTServer({
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

    const client = await createTClient(url);
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
    const { url } = await startTServer({
      schema,
    });

    const client = await createTClient(url);
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
    const { url } = await startTServer({
      schema,
    });

    const client = await createTClient(url);
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
    }, 30);
  });

  it('should execute the subscription and "next" the published payload', async () => {
    const { url } = await startTServer({
      schema,
    });

    const client = await createTClient(url);
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
            operationName: 'Greetings',
            query: `subscription Greetings {
              greetings
            }`,
          },
        }),
      );
    });

    // we say Hi in 5 languages
    for (let i = 0; i < 5; i++) {
      await client.waitForMessage();
    }

    // completed
    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Complete,
      });
    });
  });

  it('should stop dispatching messages after completing a subscription', async () => {
    const server = await startTServer({
      schema,
    });

    const client = await createTClient(server.url);
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
            query: `subscription { ping }`,
          },
        }),
      );
    });

    server.pong();

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        id: '1',
        type: MessageType.Next,
        payload: { data: { ping: 'pong' } },
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

    server.pong();
    server.pong();
    server.pong();

    await client.waitForMessage(() => {
      fail('Shouldnt have received a message');
    }, 30);
  });

  it('should close the socket on duplicate `subscription` operation subscriptions request', async () => {
    const { url } = await startTServer();

    const client = await createTClient(url);
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
            query: 'subscription { ping }',
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
          query: 'subscription { greetings }',
        },
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(4409);
      expect(event.reason).toBe('Subscriber for not-unique already exists');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should support persisted queries', async () => {
    const queriesStore: Record<string, ExecutionArgs> = {
      iWantTheValue: {
        schema,
        document: parse('query GetValue { getValue }'),
      },
    };

    const { url } = await startTServer({
      onSubscribe: (_ctx, msg) => {
        // search using `SubscriptionPayload.query` as QueryID
        // check the client example below for better understanding
        const hit = queriesStore[msg.payload.query as string];
        return {
          ...hit,
          variableValues: msg.payload.variables, // use the variables from the client
        };
      },
    });

    const client = await createTClient(url);
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
            query: 'iWantTheValue',
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
  });

  it('should call `onComplete` callback when client completes', async (done) => {
    const server = await startTServer({
      onComplete: () => {
        done();
      },
    });

    const client = await createTClient(server.url);
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
          query: 'subscription { ping }',
        },
      }),
    );
    await server.waitForOperation();

    // just to make sure we're streaming
    server.pong();
    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data).type).toBe(MessageType.Next);
    });

    // complete and done
    client.ws.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );
  });
});

describe('Keep-Alive', () => {
  it('should dispatch pings after the timeout has passed', async (done) => {
    const { url } = await startTServer({
      keepAlive: 50,
    });

    const client = await createTClient(url);
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    client.ws.once('ping', () => done());
  });

  it('should not dispatch pings if disabled with nullish timeout', async (done) => {
    const { url } = await startTServer({
      keepAlive: 0,
    });

    const client = await createTClient(url);
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    client.ws.once('ping', () => fail('Shouldnt have pinged'));

    setTimeout(done, 50);
  });

  it('should terminate the socket if no pong is sent in response to a ping', async () => {
    const { url } = await startTServer({
      keepAlive: 50,
    });

    const client = await createTClient(url);
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
