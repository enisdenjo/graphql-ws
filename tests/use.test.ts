import http from 'node:http';
import { setTimeout } from 'node:timers/promises';
import { afterAll, beforeAll, describe, it } from 'vitest';
import ws from 'ws';
import type { Extra as CrossWsExtra } from '../src/use/crossws';
import {
  CloseCode,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
  MessageType,
  parseMessage,
  stringifyMessage,
  type SubscribePayload,
} from '../src/common';
import {
  createTClient,
  tServers,
  type FastifyExtra,
  type TClient,
  type UWSExtra,
  type WSExtra,
} from './utils';
import { createDeferred } from './utils/deferred';

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

for (const { tServer, skipUWS, startTServer } of tServers) {
  describe.concurrent(tServer, () => {
    it("should omit the subprotocol from the response if there's no valid one offered by the client", async ({
      expect,
    }) => {
      const { url } = await startTServer();

      const warn = console.warn;
      console.warn = () => {
        /* hide warnings for test */
      };

      let client: TClient;
      try {
        client = await createTClient(url, ['notme', 'notmeither']);
      } catch (err) {
        expect(String(err)).toBe('Error: Server sent no subprotocol');
      }

      try {
        client = await createTClient(url, 'notme');
      } catch (err) {
        expect(String(err)).toBe('Error: Server sent no subprotocol');
      }

      try {
        client = await createTClient(url, ['graphql', 'json']);
      } catch (err) {
        expect(String(err)).toBe('Error: Server sent no subprotocol');
      }

      try {
        client = await createTClient(
          url,
          GRAPHQL_TRANSPORT_WS_PROTOCOL + 'gibberish',
        );
      } catch (err) {
        expect(String(err)).toBe('Error: Server sent no subprotocol');
      }

      client = await createTClient(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
      await client.waitForClose(
        () => {
          throw new Error('shouldnt close for valid protocol');
        },
        30, // should be kicked off within this time
      );

      client = await createTClient(url, [
        'this',
        GRAPHQL_TRANSPORT_WS_PROTOCOL,
        'one',
      ]);
      await client.waitForClose(
        (e) => {
          console.log(e);
          throw new Error('shouldnt close for valid protocol');
        },
        30, // should be kicked off within this time
      );

      console.warn = warn;
    });

    it('should gracefully go away when disposing', async ({ expect }) => {
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

    it('should add the initial request and websocket in the context extra', async ({
      expect,
    }) => {
      const { resolve: connected, promise: waitForConnect } = createDeferred();
      const server = await startTServer({
        onConnect: (ctx) => {
          if (tServer === 'uWebSockets.js') {
            // uWebSocket.js does not export classes, we can rely on the name only
            expect((ctx.extra as UWSExtra).socket.constructor.name).toEqual(
              'uWS.WebSocket',
            );
            expect((ctx.extra as UWSExtra).persistedRequest.method).toBe('get');
            expect((ctx.extra as UWSExtra).persistedRequest.url).toBe(
              '/simple',
            );
            expect((ctx.extra as UWSExtra).persistedRequest.query).toBe(
              'te=st',
            );
            expect(
              (ctx.extra as UWSExtra).persistedRequest.headers,
            ).toBeInstanceOf(Object);
          } else if (tServer === 'ws') {
            expect((ctx.extra as WSExtra).socket).toBeInstanceOf(ws);
            expect((ctx.extra as WSExtra).request).toBeInstanceOf(
              http.IncomingMessage,
            );
          } else if (tServer === '@fastify/websocket') {
            expect((ctx.extra as FastifyExtra).socket.constructor.name).toBe(
              'WebSocket',
            );
            expect((ctx.extra as FastifyExtra).request.constructor.name).toBe(
              '_Request',
            );
          } else if (tServer === 'crossws') {
            expect((ctx.extra as CrossWsExtra).socket).toBeDefined();
          } else {
            throw new Error('Missing test case for ' + tServer);
          }
          connected();
          return false; // reject client for sake of test
        },
      });

      const client = await createTClient(server.url + '?te=st');
      client.ws.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );

      await waitForConnect;
    });

    it('should close the socket with errors thrown from any callback', async ({
      expect,
    }) => {
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
        expect(event.code).toBe(CloseCode.InternalServerError);
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
          expect(event.code).toBe(CloseCode.InternalServerError);
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

    it('should close the socket on request if schema is left undefined', async ({
      expect,
    }) => {
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
        expect(event.code).toBe(CloseCode.InternalServerError);
        expect(event.reason).toBe('The GraphQL schema is not provided');
        expect(event.wasClean).toBeTruthy();
      });
    });

    it('should close the socket on empty arrays returned from `onSubscribe`', async ({
      task,
      expect,
    }) => {
      const { url } = await startTServer({
        onSubscribe: () => {
          return [];
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
      });

      client.ws.send(
        stringifyMessage<MessageType.Subscribe>({
          id: '1',
          type: MessageType.Subscribe,
          payload: {
            query: `subscription { ping(key: "${task.id}") }`,
          },
        }),
      );

      await client.waitForClose((event) => {
        expect(event.code).toBe(CloseCode.InternalServerError);
        expect(event.reason).toBe(
          'Invalid return value from onSubscribe hook, expected an array of GraphQLError objects',
        );
        expect(event.wasClean).toBeTruthy();
      });
    });

    it('should close socket with error thrown from the callback', async ({
      expect,
    }) => {
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
        expect(event.code).toBe(CloseCode.InternalServerError);
        expect(event.reason).toBe(error.message);
        expect(event.wasClean).toBeTruthy();
      });
    });

    // uWebSocket.js cannot have errors emitted on the server instance
    skipUWS(
      'should report server emitted errors to clients by closing the connection',
      async ({ expect }) => {
        const { url, server } = await startTServer();

        const client = await createTClient(url);

        const emittedError = new Error("I'm a teapot");
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        server!.emit('error', emittedError);

        await client.waitForClose((event) => {
          expect(event.code).toBe(CloseCode.InternalServerError); // CloseCode.InternalServerError: Internal server error
          expect(event.reason).toBe(emittedError.message);
          expect(event.wasClean).toBeTruthy(); // because the server reported the error
        });
      },
    );

    // uWebSocket.js cannot have errors emitted on the server instance
    skipUWS(
      'should limit the server emitted error message size',
      async ({ expect }) => {
        const { url, server, waitForClient } = await startTServer();

        const client = await createTClient(url);
        client.ws.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
          }),
        );

        await waitForClient();

        const emittedError = new Error(
          'i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characte',
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        server!.emit('error', emittedError);

        await client.waitForClose((event) => {
          expect(event.code).toBe(CloseCode.InternalServerError);
          expect(event.reason).toBe('Internal server error');
          expect(event.wasClean).toBeTruthy(); // because the server reported the error
        });
      },
    );

    // uWebSocket.js cannot have errors emitted on the socket
    skipUWS(
      'should report socket emitted errors to clients by closing the connection',
      async ({ expect }) => {
        const { url, waitForClient } = await startTServer();

        const client = await createTClient(url);

        const emittedError = new Error("I'm a teapot");
        await waitForClient((client) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          client.socket!.emit('error', emittedError);
        });

        await client.waitForClose((event) => {
          expect(event.code).toBe(CloseCode.InternalServerError); // CloseCode.InternalServerError: Internal server error
          expect(event.reason).toBe(emittedError.message);
          expect(event.wasClean).toBeTruthy(); // because the server reported the error
        });
      },
    );

    // uWebSocket.js cannot have errors emitted on the socket
    skipUWS(
      'should limit the socket emitted error message size',
      async ({ expect }) => {
        const { url, waitForClient } = await startTServer();

        const client = await createTClient(url);
        client.ws.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
          }),
        );

        const emittedError = new Error(
          'i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characte',
        );
        await waitForClient((client) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          client.socket!.emit('error', emittedError);
        });

        await client.waitForClose((event) => {
          expect(event.code).toBe(CloseCode.InternalServerError);
          expect(event.reason).toBe('Internal server error');
          expect(event.wasClean).toBeTruthy(); // because the server reported the error
        });
      },
    );

    it('should limit the internal server error message size', async ({
      expect,
    }) => {
      const { url } = await startTServer({
        onConnect: () => {
          throw new Error(
            'i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characte',
          );
        },
      });

      const client = await createTClient(url);
      client.ws.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );

      await client.waitForClose((event) => {
        expect(event.code).toBe(CloseCode.InternalServerError);
        expect(event.reason).toBe('Internal server error');
        expect(event.wasClean).toBeTruthy(); // because the server reported the error
      });
    });

    it('should handle and limit internal server errors that are not instances of `Error`', async ({
      expect,
    }) => {
      const { url } = await startTServer({
        onConnect: () => {
          throw 'i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characte';
        },
      });

      const client = await createTClient(url);
      client.ws.send(
        stringifyMessage<MessageType.ConnectionInit>({
          type: MessageType.ConnectionInit,
        }),
      );

      await client.waitForClose((event) => {
        expect(event.code).toBe(CloseCode.InternalServerError);
        expect(event.reason).toBe('Internal server error');
        expect(event.wasClean).toBeTruthy(); // because the server reported the error
      });
    });

    describe.concurrent('Keep-Alive', () => {
      it('should dispatch pings after the timeout has passed', async () => {
        const { url } = await startTServer(undefined, 50);

        const client = await createTClient(url);
        client.ws.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
          }),
        );

        const { resolve: pinged, promise: waitForPing } = createDeferred();
        client.ws.once('ping', () => pinged());
        await waitForPing;
      });

      it('should not dispatch pings if disabled with nullish timeout', async () => {
        const { url } = await startTServer(undefined, 0);

        const client = await createTClient(url);
        client.ws.send(
          stringifyMessage<MessageType.ConnectionInit>({
            type: MessageType.ConnectionInit,
          }),
        );

        client.ws.once('ping', () => {
          throw new Error('Shouldnt have pinged');
        });

        // wait some time for ping
        await setTimeout(50);
      });

      it('should terminate the socket if no pong is sent in response to a ping', async ({
        expect,
      }) => {
        const { url } = await startTServer(undefined, 50);

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
  });
}
