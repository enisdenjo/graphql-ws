import WebSocket from 'ws';
import { parse, buildSchema, execute, subscribe } from 'graphql';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../protocol';
import {
  Message,
  MessageType,
  parseMessage,
  stringifyMessage,
} from '../message';
import { Server } from '../server';
import { startServer, url, schema, pubsub } from './fixtures/simple';
import { createDeferred } from './fixtures/deferred';

// do sth. after the server received a message
const onReceiveNextMessage = (
  server: Server,
  callback: (message: WebSocket.Data) => void,
) => {
  const handler = (message: WebSocket.Data) => {
    server.webSocketServer.clients.forEach((socket) => {
      socket.off('message', handler);
    });
    setImmediate(() => {
      callback(message);
    });
  };

  server.webSocketServer.clients.forEach((socket) => {
    socket.on('message', handler);
  });

  return () => {
    server.webSocketServer.clients.forEach((socket) => {
      socket.off('message', handler);
    });
  };
};

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
  expect.assertions(9);

  await makeServer();

  let dOnClose = createDeferred();
  let client = new WebSocket(url);
  client.onclose = (event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
    dOnClose.resolve();
  };

  await dOnClose.promise;

  dOnClose = createDeferred();
  client = new WebSocket(url, ['graphql', 'json']);
  client.onclose = (event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
    dOnClose.resolve();
  };

  await dOnClose.promise;

  dOnClose = createDeferred();
  client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL + 'gibberish');
  client.onclose = (event) => {
    expect(event.code).toBe(1002);
    expect(event.reason).toBe('Protocol Error');
    expect(event.wasClean).toBeTruthy();
    dOnClose.resolve();
  };

  await dOnClose.promise;

  dOnClose = createDeferred();
  client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client.onclose = () => dOnClose.reject('Should not close.');
  // Here it seems like we cannot work without timeouts :/
  client.onopen = () => {
    setTimeout(() => {
      dOnClose.resolve();
    }, 0);
  };
  await dOnClose.promise;
});

it('should gracefully go away when disposing', async () => {
  expect.assertions(9);

  const [, dispose] = await makeServer();

  const errorFn = jest.fn();

  const onClose1 = createDeferred();
  const onClose2 = createDeferred();
  const onOpen1 = createDeferred();
  const onOpen2 = createDeferred();

  const client1 = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client1.onerror = errorFn;
  client1.onclose = (event) => {
    expect(event.code).toBe(1001);
    expect(event.reason).toBe('Going away');
    expect(event.wasClean).toBeTruthy();
    onClose1.resolve();
  };

  client1.onopen = () => onOpen1.resolve();

  const client2 = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client2.onerror = errorFn;
  client2.onclose = (event) => {
    expect(event.code).toBe(1001);
    expect(event.reason).toBe('Going away');
    expect(event.wasClean).toBeTruthy();
    onClose2.resolve();
  };

  client2.onopen = () => onOpen2.resolve();

  await Promise.all([onOpen1.promise, onOpen2.promise]);

  await dispose();

  await Promise.all([onClose1.promise, onClose2.promise]);

  expect(errorFn).not.toBeCalled();
  expect(client1.readyState).toBe(WebSocket.CLOSED);
  expect(client2.readyState).toBe(WebSocket.CLOSED);
});

it('should report server errors to clients by closing the connection', async () => {
  expect.assertions(3);

  const [{ webSocketServer }] = await makeServer();

  const emittedError = new Error("I'm a teapot");

  const dOnOpen = createDeferred();
  const dOnClose = createDeferred();

  const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  client.onclose = (event) => {
    expect(event.code).toBe(1011); // 1011: Internal Error
    expect(event.reason).toBe(emittedError.message);
    expect(event.wasClean).toBeTruthy(); // because the server reported the error
    dOnClose.resolve();
  };

  client.onopen = () => {
    dOnOpen.resolve();
  };

  await dOnOpen.promise;

  webSocketServer.emit('error', emittedError);

  await dOnClose.promise;
});

describe('Connect', () => {
  it('should refuse connection and close socket if returning `false`', async () => {
    expect.assertions(3);

    await makeServer({
      onConnect: () => {
        return false;
      },
    });

    const dOnClose = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4403);
      expect(event.reason).toBe('Forbidden');
      expect(event.wasClean).toBeTruthy();

      dOnClose.resolve();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await dOnClose.promise;
  });

  it('should close socket with error thrown from the callback', async () => {
    expect.assertions(3);

    const error = new Error("I'm a teapot");

    await makeServer({
      onConnect: () => {
        throw error;
      },
    });
    const dOnClose = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4400);
      expect(event.reason).toBe(error.message);
      expect(event.wasClean).toBeTruthy();
      dOnClose.resolve();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await dOnClose.promise;
  });

  it('should acknowledge connection if not implemented or returning `true`', async () => {
    expect.assertions(2);

    let dOnAck = createDeferred();

    function test() {
      const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
      client.onmessage = ({ data }) => {
        const message = parseMessage(data);
        expect(message.type).toBe(MessageType.ConnectionAck);
        dOnAck.resolve();
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
    await dOnAck.promise;
    await dispose();

    // returns true
    dOnAck = createDeferred();
    await makeServer({
      onConnect: () => {
        return true;
      },
    });
    test();
    await dOnAck.promise;
  });

  it('should pass in the `connectionParams` through the context and have other flags correctly set', async () => {
    expect.assertions(3);

    const connectionParams = {
      some: 'string',
      with: 'a',
      number: 10,
    };

    const dOnConnect = createDeferred();

    await makeServer({
      onConnect: (ctx) => {
        expect(ctx.connectionParams).toEqual(connectionParams);
        expect(ctx.connectionInitReceived).toBeTruthy(); // obviously received
        expect(ctx.acknowledged).toBeFalsy(); // not yet acknowledged
        dOnConnect.resolve();
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

    await dOnConnect.promise;
  });

  it('should close the socket after the `connectionInitWaitTimeout` has passed without having received a `ConnectionInit` message', async () => {
    expect.assertions(3);

    await makeServer({ connectionInitWaitTimeout: 10 });
    const dClose = createDeferred();
    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4408);
      expect(event.reason).toBe('Connection initialisation timeout');
      expect(event.wasClean).toBeTruthy();
      dClose.resolve();
    };

    await dClose.promise;
  });

  it('should not close the socket after the `connectionInitWaitTimeout` has passed but the callback is still resolving', async () => {
    expect.assertions(2);

    await makeServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 20)),
    });

    const closeFn = jest.fn();

    const dConnectionAck = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = closeFn;
    client.onmessage = ({ data }) => {
      const message = parseMessage(data);
      expect(message.type).toBe(MessageType.ConnectionAck);
      dConnectionAck.resolve();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await dConnectionAck.promise;

    expect(closeFn).not.toBeCalled();
  });

  it('should close the socket if an additional `ConnectionInit` message is received while one is pending', async () => {
    expect.assertions(3);

    await makeServer({
      connectionInitWaitTimeout: 10,
      onConnect: () =>
        new Promise((resolve) => setTimeout(() => resolve(true), 50)),
    });

    const dOnClose = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4429);
      expect(event.reason).toBe('Too many initialisation requests');
      expect(event.wasClean).toBeTruthy();
      dOnClose.resolve();
    };
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );

      // issue an additional one a bit later
      setTimeout(() => {
        client.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
          }),
        );
      }, 10);
    };

    await dOnClose.promise;
  });

  it('should close the socket if more than one `ConnectionInit` message is received at any given time', async () => {
    expect.assertions(4);

    await makeServer();

    const dOpen = createDeferred();
    const dClose = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4429);
      expect(event.reason).toBe('Too many initialisation requests');
      expect(event.wasClean).toBeTruthy();
      dClose.resolve();
    };
    client.onmessage = ({ data }) => {
      const message = parseMessage(data);
      expect(message.type).toBe(MessageType.ConnectionAck);
    };
    client.onopen = () => {
      dOpen.resolve();
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await dOpen.promise;

    // random connection init message even after acknowledgement
    client.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    await dClose.promise;
  });
});

describe('Subscribe', () => {
  it('should close the socket on request if connection is not acknowledged', async () => {
    expect.assertions(3);

    await makeServer();

    const dOnClose = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(4401);
      expect(event.reason).toBe('Unauthorized');
      expect(event.wasClean).toBeTruthy();
      dOnClose.resolve();
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

    await dOnClose.promise;
  });

  it('should close the socket on request if schema is left undefined', async () => {
    expect.assertions(3);

    await makeServer({
      schema: undefined,
    });

    const dClose = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onclose = (event) => {
      expect(event.code).toBe(1011);
      expect(event.reason).toBe('The GraphQL schema is not provided');
      expect(event.wasClean).toBeTruthy();
      dClose.resolve();
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

    await dClose.promise;
  });

  it('should pick up the schema from `onSubscribe`', async () => {
    expect.assertions(1);

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

    const dOnNext = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onerror = (ev) => dOnNext.reject((ev as any).reason);
    client.onclose = () => dOnNext.reject('Should not close.');
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
          dOnNext.resolve();
          break;
      }
    };

    await dOnNext.promise;
  });

  it('should execute the query of `string` type, "next" the result and then "complete"', async () => {
    expect.assertions(3);

    await makeServer({
      schema,
    });

    const dOnComplete = createDeferred();

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
          dOnComplete.resolve();
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await dOnComplete.promise;
  });

  it('should execute the live query, "next" multiple results and then "complete"', async () => {
    expect.assertions(5);

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

    const dOnComplete = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    let receivedNextCount = 0;
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
          receivedNextCount++;
          if (receivedNextCount === 1) {
            expect(message).toEqual({
              id: '1',
              type: MessageType.Next,
              payload: { data: { getValue: 'Hi' } },
            });
          } else if (receivedNextCount === 2) {
            expect(message).toEqual({
              id: '1',
              type: MessageType.Next,
              payload: { data: { getValue: 'Hello' } },
            });
          } else if (receivedNextCount === 3) {
            expect(message).toEqual({
              id: '1',
              type: MessageType.Next,
              payload: { data: { getValue: 'Sup' } },
            });
          }
          break;
        case MessageType.Complete:
          expect(receivedNextCount).toEqual(3);
          expect(message).toEqual({
            id: '1',
            type: MessageType.Complete,
          });
          dOnComplete.resolve();
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await dOnComplete.promise;
  });

  it('should execute the query of `DocumentNode` type, "next" the result and then "complete"', async () => {
    expect.assertions(3);

    await makeServer({
      schema,
    });

    const dMessageComplete = createDeferred();

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
          dMessageComplete.resolve();
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await dMessageComplete.promise;
  });

  it('should execute the query and "error" out because of validation errors', async () => {
    expect.assertions(7);

    await makeServer({
      schema,
    });

    const dOnError = createDeferred();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onerror = (ev) => dOnError.reject((ev as any).reason);
    client.onclose = () => dOnError.reject('Should not close.');
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
          dOnError.resolve();
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await dOnError.promise;
  });

  it('should execute the subscription and "next" the published payload', async () => {
    expect.assertions(1);

    const [server] = await makeServer({
      schema,
    });

    const dMessageNext = createDeferred();

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
          onReceiveNextMessage(server, () => {
            pubsub.publish('becameHappy', {
              becameHappy: {
                name: 'john',
              },
            });
          });

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
          );
          break;
        }
        case MessageType.Next:
          expect(message).toEqual({
            id: '1',
            type: MessageType.Next,
            payload: { data: { becameHappy: { name: 'john' } } },
          });
          dMessageNext.resolve();
          break;
        default:
          fail(`Not supposed to receive a message of type ${message.type}`);
      }
    };

    await dMessageNext.promise;
  });

  it('should stop dispatching messages after completing a subscription', async () => {
    const [server] = await makeServer({
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

    let dMessage = createDeferred<Message>();
    const dServerReceivedSubscribe = createDeferred<WebSocket.Data>();

    let invocationCounter = 0;

    const onMessageFn = jest.fn(({ data }) => {
      const message = parseMessage(data);
      if (message.type === MessageType.ConnectionAck) {
        onReceiveNextMessage(server, dServerReceivedSubscribe.resolve);
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
      } else {
        dMessage.resolve(message);
      }
      invocationCounter++;
    });
    client.onmessage = onMessageFn;

    await dServerReceivedSubscribe.promise;

    pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'john',
      },
    });

    let value = await dMessage.promise;

    expect(value).toEqual({
      id: '1',
      type: MessageType.Next,
      payload: { data: { boughtBananas: { name: 'john' } } },
    });

    dMessage = createDeferred();

    // complete
    client.send(
      stringifyMessage<MessageType.Complete>({
        id: '1',
        type: MessageType.Complete,
      }),
    );

    value = await dMessage.promise;

    // confirm complete
    expect(value).toEqual({
      id: '1',
      type: MessageType.Complete,
    });

    // TODO: if we use something like a PushPull publish we can better confirm nobody is subscribing anymore

    await pubsub.publish(
      'boughtBananas',
      new Error('Something weird happened!'),
    );
    await pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'john',
      },
    });

    expect(invocationCounter).toEqual(3); // ack, next, complete
  });

  it('should close the socket on duplicate `subscription` operation subscriptions request', async () => {
    expect.assertions(3);

    await makeServer();

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
      if (message.type === MessageType.ConnectionAck) {
        client.send(
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

        // try subscribing with a live subscription id
        setTimeout(() => {
          client.send(
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
        }, 10);
      }
    };

    await new Promise((resolve) => {
      client.onclose = (event) => {
        expect(event.code).toBe(4409);
        expect(event.reason).toBe('Subscriber for not-unique already exists');
        expect(event.wasClean).toBeTruthy();
        resolve(); // done
      };
    });
  });
});

describe('Keep-Alive', () => {
  it('should dispatch pings after the timeout has passed', async () => {
    expect.assertions(0);
    const [server] = await makeServer({
      keepAlive: 50,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    const dConnectionInit = createDeferred<unknown>();

    client.onopen = () => {
      onReceiveNextMessage(server, dConnectionInit.resolve);
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await dConnectionInit.promise;

    const dReceivedPing = createDeferred();
    client.once('ping', dReceivedPing.resolve);
  });

  it('should not dispatch pings if disabled with nullish timeout', async () => {
    const [server] = await makeServer({
      keepAlive: 0,
    });

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    const dConnectionInit = createDeferred<unknown>();

    client.onopen = () => {
      onReceiveNextMessage(server, dConnectionInit.resolve);
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };

    await dConnectionInit.promise;

    const onPingFn = jest.fn();
    client.once('ping', onPingFn);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(onPingFn).not.toBeCalled();
  });

  it('should terminate the socket if no pong is sent in response to a ping', async () => {
    expect.assertions(3);

    const [server] = await makeServer({
      keepAlive: 50,
    });

    const dConnectionInit = createDeferred<unknown>();

    const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
    client.onopen = () => {
      onReceiveNextMessage(server, dConnectionInit.resolve);
      client.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );
    };
    await dConnectionInit.promise;

    // disable pong
    client.pong = () => {
      /**/
    };

    const dClose = createDeferred();
    client.onclose = (event) => {
      // termination is not graceful or clean
      expect(event.code).toBe(1006);
      expect(event.wasClean).toBeFalsy();
      dClose.resolve();
    };

    const dOnPing = createDeferred<unknown>();
    client.once('ping', dOnPing.resolve);

    await dOnPing.promise;
    await dClose.promise;
    await new Promise(setImmediate);

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

  const [server] = await makeServer({
    schema,
    roots,
  });

  const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  const dConnectionInit = createDeferred<unknown>();
  client.onopen = () => {
    onReceiveNextMessage(server, dConnectionInit.resolve);
    client.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
  };
  await dConnectionInit.promise;

  const dMessage = createDeferred();

  client.on('message', function onMessage(data) {
    const message = parseMessage(data);
    switch (message.type) {
      case MessageType.Next:
        expect(message.type).toBe(MessageType.Next);
        expect(message.payload).toEqual({ data: { hello: 'Hello World!' } });
        break;
      case MessageType.Error:
        client.off('message', onMessage);
        return dMessage.reject('Received error.');
      case MessageType.Complete:
        client.off('message', onMessage);
        return dMessage.resolve();
    }
  });

  client.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '1',
      type: MessageType.Subscribe,
      payload: {
        query: `{ hello }`,
      },
    }),
  );

  await dMessage.promise;

  const dNextMessage = createDeferred();
  const nextFn = jest.fn();

  client.on('message', function onMessage(data) {
    const message = parseMessage(data);
    switch (message.type) {
      case MessageType.Next:
        nextFn();
        break;
      case MessageType.Error:
        client.off('message', onMessage);
        return dNextMessage.reject(message.payload);
      case MessageType.Complete:
        client.off('message', onMessage);
        return dNextMessage.resolve();
    }
  });

  client.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '2',
      type: MessageType.Subscribe,
      payload: {
        query: `subscription { count }`,
      },
    }),
  );

  await dNextMessage.promise;

  expect(nextFn).toBeCalledTimes(3);
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

  const client = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
  const dConnectionInit = createDeferred();
  client.onopen = () => {
    client.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );
  };
  client.onmessage = ({ data }) => {
    const message = parseMessage(data);
    if (message.type === MessageType.ConnectionAck) {
      dConnectionInit.resolve();
    }
  };

  await dConnectionInit.promise;

  const dQueryOperation = createDeferred();

  client.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '1',
      type: MessageType.Subscribe,
      payload: {
        query: `{ getValue }`,
      },
    }),
  );
  client.onmessage = ({ data }) => {
    const message = parseMessage(data);
    if (message.type === MessageType.Next && message.id === '1') {
      dQueryOperation.resolve();
    }
  };

  await dQueryOperation.promise;

  expect(executeFn).toBeCalled();
  expect(executeFn.mock.calls[0][0].contextValue).toBe(context);

  const dSubscriptionOperation = createDeferred();

  client.send(
    stringifyMessage<MessageType.Subscribe>({
      id: '2',
      type: MessageType.Subscribe,
      payload: {
        query: `subscription { greetings }`,
      },
    }),
  );
  client.onmessage = ({ data }) => {
    const message = parseMessage(data);
    if (message.type === MessageType.Complete && message.id === '2') {
      dSubscriptionOperation.resolve();
    }
  };

  await dSubscriptionOperation.promise;

  expect(subscribeFn).toBeCalled();
  expect(subscribeFn.mock.calls[0][0].contextValue).toBe(context);
});
