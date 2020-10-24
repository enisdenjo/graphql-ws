import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  execute,
  subscribe,
  GraphQLNonNull,
} from 'graphql';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import net from 'net';
import http from 'http';
import { PubSub } from 'graphql-subscriptions';
import { createServer, ServerOptions, Server } from '../../server';

export const pubsub = new PubSub();

// use for dispatching a `pong` to the `ping` subscription
const pendingPongs: Record<string, number | undefined> = {};
const pongListeners: Record<string, ((done: boolean) => void) | undefined> = {};
function pong(key = 'global'): void {
  if (pongListeners[key]) {
    pongListeners[key]?.(false);
  } else {
    const pending = pendingPongs[key];
    pendingPongs[key] = pending ? pending + 1 : 1;
  }
}

const personType = new GraphQLObjectType({
  name: 'Person',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      getValue: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: () => 'value',
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      greetings: {
        type: new GraphQLNonNull(GraphQLString),
        subscribe: async function* () {
          for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
            yield { greetings: hi };
          }
        },
      },
      ping: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          key: {
            type: GraphQLString,
          },
        },
        subscribe: function (_src, args) {
          const key = args.key ? args.key : 'global';
          return {
            [Symbol.asyncIterator]() {
              return this;
            },
            async next() {
              if ((pendingPongs[key] ?? 0) > 0) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                pendingPongs[key]!--;
                return { value: { ping: 'pong' } };
              }
              if (
                await new Promise((resolve) => (pongListeners[key] = resolve))
              ) {
                return { done: true };
              }
              return { value: { ping: 'pong' } };
            },
            async return() {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              pongListeners[key]!(true);
              delete pongListeners[key];
              return { done: true };
            },
            async throw() {
              throw new Error('Ping no gusta');
            },
          };
        },
      },
      // TODO-db-201022 testing `graphql-subscriptions` is not necessary. refactor the client and rely on the ping/pong above
      becameHappy: {
        type: personType,
        args: {
          secret: {
            type: new GraphQLNonNull(GraphQLString),
          },
        },
        resolve: (source) => {
          if (source instanceof Error) {
            throw source;
          }
          return source.becameHappy;
        },
        subscribe: () => {
          return pubsub.asyncIterator('becameHappy');
        },
      },
      boughtBananas: {
        type: personType,
        resolve: (source) => {
          if (source instanceof Error) {
            throw source;
          }
          return source.boughtBananas;
        },
        subscribe: () => {
          return pubsub.asyncIterator('boughtBananas');
        },
      },
    },
  }),
});

export interface TServer {
  server: Server;
  clients: Set<WebSocket>;
  pong: (key?: string) => void;
  waitForClient: (
    test?: (client: WebSocket) => void,
    expire?: number,
  ) => Promise<void>;
  waitForOperation: (test?: () => void, expire?: number) => Promise<void>;
  waitForClose: (test?: () => void, expire?: number) => Promise<void>;
  dispose: (beNice?: boolean) => Promise<void>;
}

export const port = 8273,
  path = '/graphql-simple',
  url = `ws://localhost:${port}${path}`;

export async function startTServer(
  options: Partial<ServerOptions> = {},
): Promise<TServer> {
  const emitter = new EventEmitter();

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });

  // http sockets to kick off on teardown
  const sockets = new Set<net.Socket>();
  httpServer.on('connection', (socket) => {
    sockets.add(socket);
    httpServer.once('close', () => sockets.delete(socket));
  });

  let pendingOperations = 0;
  const server = await createServer(
    {
      schema,
      execute,
      subscribe,
      ...options,
      onOperation: async (ctx, msg, args, result) => {
        pendingOperations++;
        const maybeResult = await options?.onOperation?.(
          ctx,
          msg,
          args,
          result,
        );
        emitter.emit('operation');
        return maybeResult;
      },
    },
    {
      server: httpServer,
      path,
    },
  );

  await new Promise((resolve) => httpServer.listen(port, resolve));

  // pending websocket clients
  let pendingCloses = 0;
  const pendingClients: WebSocket[] = [];
  server.webSocketServer.on('connection', (client) => {
    pendingClients.push(client);
    client.once('close', () => {
      pendingCloses++;
      emitter.emit('close');
    });
  });

  return {
    server,
    get clients() {
      return server.webSocketServer.clients;
    },
    pong,
    waitForClient(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          test?.(pendingClients.shift()!);
          resolve();
        }
        if (pendingClients.length > 0) {
          return done();
        }
        server.webSocketServer.once('connection', done);
        if (expire) {
          setTimeout(() => {
            server.webSocketServer.off('connection', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    waitForOperation(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingOperations--;
          test?.();
          resolve();
        }
        if (pendingOperations > 0) {
          return done();
        }
        emitter.once('operation', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('operation', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    waitForClose(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCloses--;
          test?.();
          resolve();
        }
        if (pendingCloses > 0) {
          return done();
        }
        emitter.once('close', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('close', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    dispose(beNice) {
      return new Promise((resolve, reject) => {
        if (!beNice) {
          for (const socket of sockets) {
            socket.destroy();
            sockets.delete(socket);
          }
        }
        const disposing = server.dispose() as Promise<void>;
        disposing.catch(reject).then(() => {
          httpServer.close(() => resolve());
        });
      });
    },
  };
}
