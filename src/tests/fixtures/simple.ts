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
import { ServerOptions, Context } from '../../server';
import { createServer } from '../../use/ws';

// distinct server for each test; if you forget to dispose, the fixture wont
const leftovers: Dispose[] = [];
afterEach(async () => {
  while (leftovers.length > 0) {
    // if not disposed by test, cleanup
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dispose = leftovers.pop()!;
    await dispose();
  }
});

export interface TServer {
  url: string;
  ws: WebSocket.Server;
  clients: Set<WebSocket>;
  pong: (key?: string) => void;
  waitForClient: (
    test?: (client: WebSocket) => void,
    expire?: number,
  ) => Promise<void>;
  waitForConnect: (
    test?: (ctx: Context) => void,
    expire?: number,
  ) => Promise<void>;
  waitForOperation: (test?: () => void, expire?: number) => Promise<void>;
  waitForComplete: (test?: () => void, expire?: number) => Promise<void>;
  waitForClientClose: (test?: () => void, expire?: number) => Promise<void>;
  dispose: Dispose;
}

type Dispose = (beNice?: boolean) => Promise<void>;

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
              pongListeners[key]?.(true);
              delete pongListeners[key];
              return { done: true };
            },
            async throw() {
              throw new Error('Ping no gusta');
            },
          };
        },
      },
    },
  }),
});

export async function startTServer(
  options: Partial<ServerOptions> = {},
  keepAlive?: number, // for ws tests sake
): Promise<TServer> {
  const path = '/simple';
  const emitter = new EventEmitter();

  // prepare http server
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

  // create server and hook up for tracking operations
  const pendingConnections: Context[] = [];
  let pendingOperations = 0,
    pendingCompletes = 0;
  const ws = new WebSocket.Server({
    server: httpServer,
    path,
  });
  const server = await createServer(
    {
      schema,
      execute,
      subscribe,
      ...options,
      onConnect: async (...args) => {
        pendingConnections.push(args[0]);
        const permitted = await options?.onConnect?.(...args);
        emitter.emit('conn');
        return permitted;
      },
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
      onComplete: async (...args) => {
        pendingCompletes++;
        await options?.onComplete?.(...args);
        emitter.emit('compl');
      },
    },
    ws,
    keepAlive,
  );

  // search for open port from the starting port
  let tried = 0;
  for (;;) {
    try {
      await new Promise((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.once('listening', resolve);
        try {
          httpServer.listen(0, resolve);
        } catch (err) {
          reject(err);
        }
      });
      break; // listening
    } catch (err) {
      if ('code' in err && err.code === 'EADDRINUSE') {
        tried++;
        if (tried > 10) {
          throw new Error(
            `Cant find open port, stopping search after ${tried} tries`,
          );
        }
        continue; // try another one if this port is in use
      } else {
        throw err; // throw all other errors immediately
      }
    }
  }

  // pending websocket clients
  let pendingCloses = 0;
  const pendingClients: WebSocket[] = [];
  ws.on('connection', (client) => {
    pendingClients.push(client);
    client.once('close', () => {
      pendingCloses++;
      emitter.emit('close');
    });
  });

  // disposes of all started servers
  const dispose: Dispose = (beNice) => {
    return new Promise((resolve, reject) => {
      if (!beNice) {
        for (const socket of sockets) {
          socket.destroy();
          sockets.delete(socket);
        }
      }
      const disposing = server.dispose() as Promise<void>;
      disposing.catch(reject).then(() => {
        httpServer.close(() => {
          leftovers.splice(leftovers.indexOf(dispose), 1);
          resolve();
        });
      });
    });
  };
  leftovers.push(dispose);

  const addr = httpServer.address();
  if (!addr || typeof addr !== 'object') {
    throw new Error(`Unexpected http server address ${addr}`);
  }

  return {
    url: `ws://localhost:${addr.port}${path}`,
    ws,
    get clients() {
      return ws.clients;
    },
    pong,
    waitForClient(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const client = pendingClients.shift()!;
          test?.(client);
          resolve();
        }
        if (pendingClients.length > 0) {
          return done();
        }
        ws.once('connection', done);
        if (expire) {
          setTimeout(() => {
            ws.off('connection', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    waitForConnect(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const ctx = pendingConnections.shift()!;
          test?.(ctx);
          resolve();
        }
        if (pendingConnections.length > 0) {
          return done();
        }
        emitter.once('conn', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('conn', done); // expired
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
    waitForComplete(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCompletes--;
          test?.();
          resolve();
        }
        if (pendingCompletes > 0) {
          return done();
        }
        emitter.once('compl', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('compl', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    waitForClientClose(test, expire) {
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
    dispose,
  };
}
