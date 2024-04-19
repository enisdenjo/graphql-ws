import {
  parse,
  buildSchema,
  execute,
  subscribe,
  GraphQLError,
  ExecutionArgs,
  ExecutionResult,
  GraphQLSchema,
} from 'graphql';
import { Context, handleProtocols, makeServer } from '../server';
import {
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  CloseCode,
  MessageType,
  parseMessage,
  stringifyMessage,
} from '../common';
import { schema, schemaConfig } from './fixtures/simple';
import { createTClient, startWSTServer as startTServer } from './utils';

// silence console.error calls for nicer tests overview
const consoleError = console.error;
beforeAll(() => {
  console.error = () => {
    // silence
  };
});
afterAll(() => {
  console.error = consoleError;
});

/**
 * Tests
 */

it('should use the schema resolved from a promise on subscribe', async (done) => {
  expect.assertions(2);

  const schema = new GraphQLSchema(schemaConfig);

  const { url } = await startTServer({
    schema: (_, msg) => {
      expect(msg.id).toBe('1');
      return Promise.resolve(schema);
    },
    execute: (args) => {
      expect(args.schema).toBe(schema);
      return execute(args);
    },
    onComplete: () => done(),
  });
  const client = await createTClient(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client.ws.send(
    stringifyMessage<MessageType.ConnectionInit>({
      type: MessageType.ConnectionInit,
    }),
  );
  await client.waitForMessage(); // ack

  client.ws.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '1',
      type: MessageType.Subscribe,
      payload: {
        query: '{ getValue }',
      },
    }),
  );
});

it('should use the provided validate function', async () => {
  const { url } = await startTServer({
    schema,
    validate: () => [new GraphQLError('Nothing is valid')],
  });
  const client = await createTClient(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client.ws.send(
    stringifyMessage<MessageType.ConnectionInit>({
      type: MessageType.ConnectionInit,
    }),
  );
  await client.waitForMessage(); // ack

  client.ws.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '1',
      type: MessageType.Subscribe,
      payload: {
        query: '{ getValue }',
      },
    }),
  );
  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data)).toEqual({
      id: '1',
      type: MessageType.Error,
      payload: [{ message: 'Nothing is valid' }],
    });
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

it('should use the root from the `roots` option if the `onSubscribe` doesnt provide one', async (done) => {
  const rootValue = {};
  const execArgs = {
    // no rootValue here
    schema,
    document: parse(`query { getValue }`),
  };

  const { url } = await startTServer({
    roots: {
      query: rootValue,
    },
    onSubscribe: () => {
      return execArgs;
    },
    execute: (args) => {
      expect(args).toBe(execArgs); // from `onSubscribe`
      expect(args.rootValue).toBe(rootValue); // injected by `roots`
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

it('should use a custom JSON message replacer function', async () => {
  const { url } = await startTServer({
    schema,
    jsonMessageReplacer: (key, value) => {
      if (key === 'type') {
        return 'CONNECTION_ACK';
      }
      return value;
    },
  });

  const client = await createTClient(url);
  client.ws.send(
    stringifyMessage<MessageType.ConnectionInit>({
      type: MessageType.ConnectionInit,
    }),
  );

  await client.waitForMessage(({ data }) => {
    expect(data).toBe('{"type":"CONNECTION_ACK"}');
  });
});

it('should use a custom JSON message reviver function', async () => {
  const { url } = await startTServer({
    schema,
    jsonMessageReviver: (key, value) => {
      if (key === 'type') {
        return MessageType.ConnectionInit;
      }
      return value;
    },
  });

  const client = await createTClient(url);
  client.ws.send(
    JSON.stringify({
      type: MessageType.ConnectionInit.toUpperCase(),
    }),
  );

  await client.waitForMessage(({ data }) => {
    expect(parseMessage(data).type).toBe(MessageType.ConnectionAck);
  });
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
      expect(event.code).toBe(CloseCode.Forbidden);
      expect(event.reason).toBe('Forbidden');
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

  it('should send optional payload with connection ack message', async () => {
    const { url } = await startTServer({
      onConnect: () => {
        return {
          itsa: 'me',
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
      expect(parseMessage(data)).toEqual({
        type: MessageType.ConnectionAck,
        payload: { itsa: 'me' },
      });
    });
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

    await (
      await createTClient(url)
    ).waitForClose((event) => {
      expect(event.code).toBe(CloseCode.ConnectionInitialisationTimeout);
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
      expect(event.code).toBe(CloseCode.TooManyInitialisationRequests);
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
      expect(event.code).toBe(CloseCode.TooManyInitialisationRequests);
      expect(event.reason).toBe('Too many initialisation requests');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it("should have acknowledged connection even if ack message send didn't resolve", (done) => {
    let sent: Promise<void> | null = null;
    let resolveSend = () => {
      // noop
    };
    makeServer({
      schema,
      onSubscribe(ctx) {
        expect(ctx.acknowledged).toBeTruthy();
        resolveSend();
        done();
      },
    }).opened(
      {
        protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
        send: async () => {
          // if already set, this is a subsequent send happening after the test
          if (sent) {
            return;
          }

          // message was sent and delivered to the client...
          sent = new Promise((resolve) => {
            resolve();
          });
          await sent;

          // ...but something else is slow - leading to a potential race condition on the `acknowledged` flag
          await new Promise<void>((resolve) => (resolveSend = resolve));
        },
        close: (code, reason) => {
          fail(`Unexpected close with ${code}: ${reason}`);
        },
        onMessage: async (cb) => {
          cb(stringifyMessage({ type: MessageType.ConnectionInit }));
          await sent;
          cb(
            stringifyMessage({
              id: '1',
              type: MessageType.Subscribe,
              payload: { query: '{ getValue }' },
            }),
          );
        },
        onPing: () => {
          /**/
        },
        onPong: () => {
          /**/
        },
      },
      {},
    );
  });
});

describe('Ping/Pong', () => {
  it('should respond with a pong to a ping', async () => {
    const { url } = await startTServer();

    const client = await createTClient(url);

    client.ws.send(
      stringifyMessage({
        type: MessageType.Ping,
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        type: MessageType.Pong,
      });
    });
  });

  it("should return ping's payload through the pong", async () => {
    const { url } = await startTServer();

    const client = await createTClient(url);

    client.ws.send(
      stringifyMessage({
        type: MessageType.Ping,
        payload: { iCome: 'back' },
      }),
    );

    await client.waitForMessage(({ data }) => {
      expect(parseMessage(data)).toEqual({
        type: MessageType.Pong,
        payload: { iCome: 'back' },
      });
    });
  });

  it('should not react to a pong', async () => {
    const { url } = await startTServer();

    const client = await createTClient(url);

    client.ws.send(
      stringifyMessage({
        type: MessageType.Pong,
      }),
    );

    await client.waitForMessage(() => {
      fail('Shouldt have received a message');
    }, 20);

    await client.waitForClose(() => {
      fail('Shouldt have closed');
    }, 20);
  });

  it('should invoke the websocket callback on ping and not reply automatically', async (done) => {
    const payload = { not: 'relevant' };

    const closed = makeServer({}).opened(
      {
        protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
        send: () => fail('Shouldnt have responded to a ping'),
        close: () => {
          /**/
        },
        onMessage: (cb) => {
          cb(stringifyMessage({ type: MessageType.Ping, payload }));
        },
        onPing: (pyld) => {
          setImmediate(() => {
            expect(pyld).toEqual(payload);
            closed(1000, '');
            done();
          });
        },
        onPong: () => fail('Nothing shouldve ponged'),
      },
      {},
    );
  });

  it('should invoke the websocket callback on pong', async (done) => {
    const payload = { not: 'relevant' };

    const closed = makeServer({}).opened(
      {
        protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
        send: () => Promise.resolve(),
        close: () => {
          /**/
        },
        onMessage: (cb) => {
          cb(stringifyMessage({ type: MessageType.Pong, payload }));
        },
        onPing: () => fail('Nothing shouldve pinged'),
        onPong: (pyld) => {
          setImmediate(() => {
            expect(pyld).toEqual(payload);
            closed(1000, '');
            done();
          });
        },
      },
      {},
    );
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
      expect(event.code).toBe(CloseCode.Unauthorized);
      expect(event.reason).toBe('Unauthorized');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should directly use the execution arguments returned from `onSubscribe`', async () => {
    const nopeArgs = {
      schema,
      operationName: 'Nope',
      document: parse(`query Nope { getValue }`),
      rootValue: null,
    };
    const { url } = await startTServer({
      schema: undefined,
      roots: {
        query: { not: 'me' },
      },
      execute: (args) => {
        expect(args.schema).toBe(nopeArgs.schema); // schema from nopeArgs
        expect(args.rootValue).toBeNull(); // nopeArgs provided rootValue: null, so don't overwrite
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

  it('should be able to complete a long running query before the result becomes available', async () => {
    let resultIsHere = (_result: ExecutionResult) => {
        /* noop for calming typescript */
      },
      execute = () => {
        /* noop for calming typescript */
      };
    const waitForExecute = new Promise<void>((resolve) => (execute = resolve));

    const { url, getClients } = await startTServer({
      schema,
      execute: () =>
        new Promise<ExecutionResult>((resolve) => {
          resultIsHere = resolve;
          execute();
        }),
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
            query: 'query { getValue }',
          },
        }),
      );
    });

    await waitForExecute;

    // complete before resolve
    client.ws.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );

    // will be just one client and the only next message can be "complete"
    for (const client of getClients()) {
      await new Promise<void>((resolve) => {
        const off = client.onMessage(() => {
          off();
          resolve();
        });
      });
    }

    // result became available after complete
    resultIsHere({ data: { getValue: 'nope' } });

    await client.waitForMessage(() => {
      fail('No further activity expected after complete');
    }, 30);
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

    // send complete
    client.ws.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );

    await server.waitForComplete();

    server.pong();
    server.pong();
    server.pong();

    await client.waitForMessage(() => {
      fail("Shouldn't have received a message");
    }, 30);
  });

  it('should close the socket on duplicate operation requests', async () => {
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
          query: 'query { getValue }',
        },
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(CloseCode.SubscriberAlreadyExists);
      expect(event.reason).toBe('Subscriber for not-unique already exists');
      expect(event.wasClean).toBeTruthy();
    });
  });

  it('should close the socket on duplicate operation requests even if one is still preparing', async () => {
    const { url } = await startTServer({
      onSubscribe: () =>
        new Promise(() => {
          /* i never resolve, the subscription will be preparing forever */
        }),
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
          id: 'not-unique',
          type: MessageType.Subscribe,
          payload: {
            query: 'query { getValue }',
          },
        }),
      );
    });

    client.ws.send(
      stringifyMessage<MessageType.Subscribe>({
        id: 'not-unique',
        type: MessageType.Subscribe,
        payload: {
          query: 'query { getValue }',
        },
      }),
    );

    await client.waitForClose((event) => {
      expect(event.code).toBe(CloseCode.SubscriberAlreadyExists);
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

  it('should call `onComplete` callback even if socket terminates abruptly', async (done) => {
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

    // terminate socket abruptly
    client.ws.terminate();
  });

  it('should respect completed subscriptions even if subscribe operation stalls', async () => {
    let continueSubscribe: (() => void) | undefined = undefined;
    const server = await startTServer({
      subscribe: async (...args) => {
        await new Promise<void>((resolve) => (continueSubscribe = resolve));
        return subscribe(...args);
      },
    });

    const client = await createTClient(server.url);
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
    await client.waitForMessage(); // ack

    client.ws.send(
      stringifyMessage<MessageType.Subscribe>({
        id: '1',
        type: MessageType.Subscribe,
        payload: {
          query: 'subscription { ping }',
        },
      }),
    );

    // wait for the subscribe lock
    while (!continueSubscribe) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // send complete
    client.ws.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );

    // wait for complete message
    for (const client of server.getClients()) {
      await new Promise<void>((resolve) => {
        const off = client.onMessage(() => {
          off();
          resolve();
        });
      });
    }

    // then continue
    (continueSubscribe as () => void)();

    // emit
    server.pong();

    await client.waitForMessage(() => {
      fail("Shouldn't have received a message");
    }, 30);

    await server.waitForComplete();
  });

  it('should clean up subscription reservations on abrupt errors without relying on close', async (done) => {
    let currCtx: Context;
    makeServer({
      connectionInitWaitTimeout: 0, // defaults to 3 seconds
      schema,
      execute: () => {
        throw null;
      },
      onSubscribe: (ctx) => {
        currCtx = ctx;
      },
    }).opened(
      {
        protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
        send: () => {
          /**/
        },
        close: () => {
          fail("Shouldn't have closed");
        },
        onMessage: async (cb) => {
          await cb(stringifyMessage({ type: MessageType.ConnectionInit }));

          try {
            // will throw because of execute impl
            await cb(
              stringifyMessage({
                id: '1',
                type: MessageType.Subscribe,
                payload: {
                  query: '{ getValue }',
                },
              }),
            );
            fail("Subscribe shouldn't have succeeded");
          } catch {
            // we dont close the connection but still expect the subscriptions to clean up
            expect(Object.entries(currCtx.subscriptions)).toHaveLength(0);
            done();
          }
        },
      },
      {},
    );
  });

  it('should not send a complete message back if the client sent it', async () => {
    const server = await startTServer();

    const client = await createTClient(server.url);

    client.ws.send(
      stringifyMessage({
        type: MessageType.ConnectionInit,
      }),
    );
    await client.waitForMessage(); // MessageType.ConnectionAck

    client.ws.send(
      stringifyMessage({
        id: '1',
        type: MessageType.Subscribe,
        payload: {
          query: 'subscription { lateReturn }',
        },
      }),
    );
    await server.waitForOperation();

    client.ws.send(
      stringifyMessage({
        id: '1',
        type: MessageType.Complete,
      }),
    );
    await server.waitForComplete();

    await client.waitForMessage(() => {
      fail("Shouldn't have received a message");
    }, 20);
  });

  it('should not send error messages if socket closes before onSubscribe hooks resolves', async () => {
    let resolveOnSubscribe: () => void = () => {
      throw new Error('On subscribe resolved early');
    };
    const waitForOnSubscribe = new Promise<void>(
      (resolve) => (resolveOnSubscribe = resolve),
    );

    let resolveSubscribe: () => void = () => {
      throw new Error('Subscribe resolved early');
    };

    const sendFn = jest.fn();

    const closed = makeServer({
      schema,
      async onSubscribe() {
        resolveOnSubscribe();
        await new Promise<void>((resolve) => (resolveSubscribe = resolve));
        return [new GraphQLError('Oopsie!')];
      },
    }).opened(
      {
        protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
        send: sendFn,
        close: () => {
          // noop
        },
        onMessage: async (cb) => {
          await cb(stringifyMessage({ type: MessageType.ConnectionInit }));
          await cb(
            stringifyMessage({
              id: '1',
              type: MessageType.Subscribe,
              payload: { query: '{ getValue }' },
            }),
          );
        },
        onPing: () => {
          /**/
        },
        onPong: () => {
          /**/
        },
      },
      {},
    );

    await waitForOnSubscribe;

    closed(4321, 'Bye bye!');

    resolveSubscribe();

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sendFn).toHaveBeenCalledTimes(1); // only the ack message
  });
});

describe('Disconnect/close', () => {
  it('should report close code and reason to disconnect and close callback after connection acknowledgement', async (done) => {
    const { url, waitForConnect } = await startTServer({
      // 1st
      onDisconnect: (_ctx, code, reason) => {
        expect(code).toBe(4321);
        expect(reason).toBe('Byebye');
      },
      // 2nd
      onClose: (_ctx, code, reason) => {
        expect(code).toBe(4321);
        expect(String(reason)).toBe('Byebye');
        done();
      },
    });

    const client = await createTClient(url);

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
    await waitForConnect();

    client.ws.close(4321, 'Byebye');
  });

  it('should trigger the close callback instead of disconnect if connection is not acknowledged', async (done) => {
    const { url } = await startTServer({
      onDisconnect: () => {
        fail("Disconnect callback shouldn't be triggered");
      },
      onClose: (_ctx, code, reason) => {
        expect(code).toBe(4321);
        expect(String(reason)).toBe('Byebye');
        done();
      },
    });

    const client = await createTClient(url);

    client.ws.close(4321, 'Byebye');
  });

  it('should dispose of subscriptions on close even if added late to the subscriptions list', async () => {
    let resolveOnOperation: () => void = () => {
      throw new Error('On operation resolved early');
    };
    const waitForOnOperation = new Promise<void>(
      (resolve) => (resolveOnOperation = resolve),
    );
    let resolveOperation: () => void = () => {
      throw new Error('Operation resolved early');
    };
    const { url, waitForConnect, waitForComplete, waitForClientClose } =
      await startTServer({
        onOperation: () => {
          resolveOnOperation();
          return new Promise((resolve) => (resolveOperation = resolve));
        },
      });

    const client = await createTClient(url);

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
    await waitForConnect();

    client.ws.send(
      stringifyMessage<MessageType.Subscribe>({
        type: MessageType.Subscribe,
        id: '1',
        payload: {
          query: 'subscription { ping }',
        },
      }),
    );

    await waitForOnOperation;

    client.ws.close(4321, 'Byebye');
    await waitForClientClose();

    resolveOperation();

    await waitForComplete();
  });

  it('should dispose of all subscriptions on close even if some return is problematic', async () => {
    let resolveReturn: () => void = () => {
      throw new Error('Return resolved early');
    };
    let i = 0;

    const {
      url,
      waitForConnect,
      waitForOperation,
      waitForComplete,
      waitForClientClose,
    } = await startTServer({
      onOperation(_ctx, _msg, _args, result) {
        const origReturn = (result as AsyncGenerator).return;
        (result as AsyncGenerator).return = async (...args) => {
          if (++i === 1) {
            // slow down the first return
            await new Promise<void>((resolve) => (resolveReturn = resolve));
          }
          return origReturn(...args);
        };
        return result;
      },
    });

    const client = await createTClient(url);

    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
    await waitForConnect();

    client.ws.send(
      stringifyMessage<MessageType.Subscribe>({
        type: MessageType.Subscribe,
        id: '1',
        payload: {
          query: 'subscription { ping(key: "slow") }',
        },
      }),
    );
    await waitForOperation();

    client.ws.send(
      stringifyMessage<MessageType.Subscribe>({
        type: MessageType.Subscribe,
        id: '2',
        payload: {
          query: 'subscription { ping(key: "ok") }',
        },
      }),
    );
    await waitForOperation();

    client.ws.close(4321, 'Byebye');
    await waitForClientClose();

    await waitForComplete();
    resolveReturn();
    await waitForComplete();
  });
});

it('should only accept a Set, Array or string in handleProtocol', () => {
  for (const test of [
    {
      in: new Set(['not', 'me']),
      out: false,
    },
    {
      in: new Set(['maybe', 'me', GRAPHQL_TRANSPORT_WS_PROTOCOL + 'nah']),
      out: false,
    },
    {
      in: new Set(['almost', 'next', GRAPHQL_TRANSPORT_WS_PROTOCOL, 'one']),
      out: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    },
    {
      in: [''],
      out: false,
    },
    {
      in: ['123', GRAPHQL_TRANSPORT_WS_PROTOCOL],
      out: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    },
    {
      in: [GRAPHQL_TRANSPORT_WS_PROTOCOL, GRAPHQL_TRANSPORT_WS_PROTOCOL],
      out: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    },
    {
      in: `some, ${GRAPHQL_TRANSPORT_WS_PROTOCOL}   , other-one,third`,
      out: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    },
    {
      in: `no, graphql-TransPort-ws`,
      out: false,
    },
    {
      in: { iAm: 'unacceptable' },
      out: false,
    },
    {
      in: 123,
      out: false,
    },
    {
      in: null,
      out: false,
    },
    {
      in: undefined,
      out: false,
    },
    {
      in: () => {
        // void
      },
      out: false,
    },
  ]) {
    expect(
      // @ts-expect-error for test purposes, in can be different from type
      handleProtocols(test.in),
    ).toBe(test.out);
  }
});
