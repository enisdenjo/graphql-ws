import { EventEmitter } from 'events';
import http from 'http';
import { schema, pong } from '../fixtures/simple';
import { ServerOptions, Context } from '../../server';

import ws from 'ws';
import uWS from 'uWebSockets.js';
import Fastify from 'fastify';
import fastifyWebsocket from 'fastify-websocket';

import { useServer as useWSServer, Extra as WSExtra } from '../../use/ws';
import {
  makeBehavior as makeUWSBehavior,
  Extra as UWSExtra,
} from '../../use/uWebSockets';
import {
  makeHandler as makeFastifyHandler,
  Extra as FastifyExtra,
} from '../../use/fastify-websocket';
export { WSExtra, UWSExtra, FastifyExtra };

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

export interface TServerClient {
  send(data: string): void;
  onMessage(cb: (message: string) => void): () => void;
  close(code?: number, data?: string): void;
}

export interface TServer {
  url: string;
  getClients: () => TServerClient[];
  pong: (key?: string) => void;
  waitForClient: (
    test?: (client: TServerClient) => void,
    expire?: number,
  ) => Promise<void>;
  waitForConnect: (
    test?: (ctx: Context<WSExtra | UWSExtra | FastifyExtra>) => void,
    expire?: number,
  ) => Promise<void>;
  waitForOperation: (test?: () => void, expire?: number) => Promise<void>;
  waitForComplete: (test?: () => void, expire?: number) => Promise<void>;
  waitForClientClose: (test?: () => void, expire?: number) => Promise<void>;
  dispose: Dispose;
}

type Dispose = (beNice?: boolean) => Promise<void>;

async function getAvailablePort() {
  const httpServer = http.createServer();

  let tried = 0;
  for (;;) {
    try {
      await new Promise((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.once('listening', resolve);
        try {
          httpServer.listen(0);
        } catch (err) {
          reject(err);
        }
      });
      break; // listening
    } catch (err) {
      if ('code' in err && err.code === 'EADDRINUSE') {
        tried++;
        if (tried > 10)
          throw new Error(
            `Cant find open port, stopping search after ${tried} tries`,
          );
        continue; // try another one if this port is in use
      } else {
        throw err; // throw all other errors immediately
      }
    }
  }

  const addr = httpServer.address();
  if (!addr || typeof addr !== 'object')
    throw new Error(`Unexpected http server address ${addr}`);

  // port found, stop server
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));

  return addr.port;
}

export async function startWSTServer(
  options: Partial<ServerOptions> = {},
  keepAlive?: number, // for ws tests sake
): Promise<TServer> {
  const path = '/simple';
  const emitter = new EventEmitter();
  const port = await getAvailablePort();
  const wsServer = new ws.Server({ port, path });

  // sockets to kick off on teardown
  const sockets = new Set<ws>();
  wsServer.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  const pendingConnections: Context<WSExtra>[] = [];
  let pendingOperations = 0,
    pendingCompletes = 0;
  const server = useWSServer(
    {
      schema,
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
    wsServer,
    keepAlive,
  );

  const dispose: Dispose = (beNice) => {
    return new Promise((resolve, reject) => {
      if (!beNice)
        for (const socket of sockets) {
          socket.terminate();
          sockets.delete(socket);
        }
      const disposing = server.dispose() as Promise<void>;
      disposing.catch(reject).then(() => {
        wsServer.close(() => {
          leftovers.splice(leftovers.indexOf(dispose), 1);
          resolve();
        });
      });
    });
  };
  leftovers.push(dispose);

  // pending websocket clients
  let pendingCloses = 0;
  const pendingClients: TServerClient[] = [];
  wsServer.on('connection', (client) => {
    pendingClients.push(toClient(client));
    client.once('close', () => {
      pendingCloses++;
      emitter.emit('close');
    });
  });

  function toClient(socket: ws): TServerClient {
    return {
      send: (data) => socket.send(data),
      onMessage: (cb) => {
        const listener = (data: unknown) => cb(String(data));
        socket.on('message', listener);
        return () => socket.off('message', listener);
      },
      close: (...args) => socket.close(...args),
    };
  }

  return {
    url: `ws://localhost:${port}${path}`,
    getClients() {
      return Array.from(wsServer.clients, toClient);
    },
    waitForClient(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const client = pendingClients.shift()!;
          test?.(client);
          resolve();
        }
        if (pendingClients.length > 0) return done();
        wsServer.once('connection', done);
        if (expire)
          setTimeout(() => {
            wsServer.off('connection', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForClientClose(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCloses--;
          test?.();
          resolve();
        }
        if (pendingCloses > 0) return done();

        emitter.once('close', done);
        if (expire)
          setTimeout(() => {
            emitter.off('close', done); // expired
            resolve();
          }, expire);
      });
    },
    pong,
    waitForConnect(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const ctx = pendingConnections.shift()!;
          test?.(ctx);
          resolve();
        }
        if (pendingConnections.length > 0) return done();
        emitter.once('conn', done);
        if (expire)
          setTimeout(() => {
            emitter.off('conn', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForOperation(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingOperations--;
          test?.();
          resolve();
        }
        if (pendingOperations > 0) return done();
        emitter.once('operation', done);
        if (expire)
          setTimeout(() => {
            emitter.off('operation', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForComplete(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCompletes--;
          test?.();
          resolve();
        }
        if (pendingCompletes > 0) return done();
        emitter.once('compl', done);
        if (expire)
          setTimeout(() => {
            emitter.off('compl', done); // expired
            resolve();
          }, expire);
      });
    },
    dispose,
  };
}

export async function startUWSTServer(
  options: Partial<ServerOptions> = {},
  keepAlive?: number, // for ws tests sake
): Promise<TServer> {
  const path = '/simple';
  const emitter = new EventEmitter();
  const port = await getAvailablePort();

  // sockets to kick off on teardown
  const sockets = new Set<uWS.WebSocket>();

  const pendingConnections: Context<UWSExtra>[] = [];
  let pendingOperations = 0,
    pendingCompletes = 0;
  const listenSocket = await new Promise<uWS.us_listen_socket>(
    (resolve, reject) => {
      uWS
        .App()
        .ws(
          path,
          makeUWSBehavior(
            {
              schema,
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
            {
              open: (socket) => sockets.add(socket),
              close: (socket) => sockets.delete(socket),
            },
            keepAlive,
          ),
        )
        .listen(port, (listenSocket: uWS.us_listen_socket) => {
          if (listenSocket) resolve(listenSocket);
          else reject('There is no UWS socket');
        });
    },
  );

  const dispose: Dispose = async (beNice) => {
    for (const socket of sockets) {
      if (beNice) socket.end(1001, 'Going away');
      else socket.close();
    }
    uWS.us_listen_socket_close(listenSocket);
    leftovers.splice(leftovers.indexOf(dispose), 1);
  };
  leftovers.push(dispose);

  return {
    url: `ws://localhost:${port}${path}`,
    // @ts-expect-error TODO-db-210410
    getClients: null,
    // @ts-expect-error TODO-db-210410
    waitForClient: null,
    // @ts-expect-error TODO-db-210410
    waitForClientClose: null,
    pong,
    waitForConnect(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const ctx = pendingConnections.shift()!;
          test?.(ctx);
          resolve();
        }
        if (pendingConnections.length > 0) return done();
        emitter.once('conn', done);
        if (expire)
          setTimeout(() => {
            emitter.off('conn', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForOperation(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingOperations--;
          test?.();
          resolve();
        }
        if (pendingOperations > 0) return done();
        emitter.once('operation', done);
        if (expire)
          setTimeout(() => {
            emitter.off('operation', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForComplete(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCompletes--;
          test?.();
          resolve();
        }
        if (pendingCompletes > 0) return done();
        emitter.once('compl', done);
        if (expire)
          setTimeout(() => {
            emitter.off('compl', done); // expired
            resolve();
          }, expire);
      });
    },
    dispose,
  };
}

export async function startFastifyWSTServer(
  options: Partial<ServerOptions> = {},
  keepAlive?: number, // for ws tests sake
): Promise<TServer> {
  const path = '/simple';
  const emitter = new EventEmitter();
  const port = await getAvailablePort();

  const fastify = Fastify();
  fastify.register(fastifyWebsocket);

  // sockets to kick off on teardown
  const sockets = new Set<ws>();

  const pendingConnections: Context<FastifyExtra>[] = [];
  const pendingClients: TServerClient[] = [];
  let pendingOperations = 0,
    pendingCompletes = 0,
    pendingCloses = 0;

  function toClient(socket: ws): TServerClient {
    return {
      send: (data) => socket.send(data),
      onMessage: (cb) => {
        const listener = (data: unknown) => cb(String(data));
        socket.on('message', listener);
        return () => socket.off('message', listener);
      },
      close: (...args) => socket.close(...args),
    };
  }

  fastify.get(path, { websocket: true }, (connection, request) => {
    sockets.add(connection.socket);
    pendingClients.push(toClient(connection.socket));
    connection.socket.once('close', () => {
      sockets.delete(connection.socket);
      pendingCloses++;
      emitter.emit('close');
    });

    makeFastifyHandler(
      {
        schema,
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
      keepAlive,
    ).call(fastify, connection, request);
  });

  const dispose: Dispose = (beNice) => {
    return new Promise((resolve, reject) => {
      for (const socket of sockets) {
        if (beNice) socket.close(1001, 'Going away');
        else socket.terminate();
        sockets.delete(socket);
      }

      fastify.websocketServer.close((err) => {
        if (err) return reject(err);
        fastify.close(() => {
          leftovers.splice(leftovers.indexOf(dispose), 1);
          resolve();
        });
      });
    });
  };
  leftovers.push(dispose);

  await new Promise<void>((resolve, reject) => {
    fastify.listen(port, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  return {
    url: `ws://localhost:${port}${path}`,
    getClients() {
      return Array.from(fastify.websocketServer.clients, toClient);
    },
    waitForClient(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const client = pendingClients.shift()!;
          test?.(client);
          resolve();
        }
        if (pendingClients.length > 0) return done();
        fastify.websocketServer.once('connection', done);
        if (expire)
          setTimeout(() => {
            fastify.websocketServer.off('connection', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForClientClose(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCloses--;
          test?.();
          resolve();
        }
        if (pendingCloses > 0) return done();

        emitter.once('close', done);
        if (expire)
          setTimeout(() => {
            emitter.off('close', done); // expired
            resolve();
          }, expire);
      });
    },
    pong,
    waitForConnect(test, expire) {
      return new Promise((resolve) => {
        function done() {
          // the on connect listener below will be called before our listener, populating the queue
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const ctx = pendingConnections.shift()!;
          test?.(ctx);
          resolve();
        }
        if (pendingConnections.length > 0) return done();
        emitter.once('conn', done);
        if (expire)
          setTimeout(() => {
            emitter.off('conn', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForOperation(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingOperations--;
          test?.();
          resolve();
        }
        if (pendingOperations > 0) return done();
        emitter.once('operation', done);
        if (expire)
          setTimeout(() => {
            emitter.off('operation', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForComplete(test, expire) {
      return new Promise((resolve) => {
        function done() {
          pendingCompletes--;
          test?.();
          resolve();
        }
        if (pendingCompletes > 0) return done();
        emitter.once('compl', done);
        if (expire)
          setTimeout(() => {
            emitter.off('compl', done); // expired
            resolve();
          }, expire);
      });
    },
    dispose,
  };
}

export const tServers = [
  {
    tServer: 'ws' as const,
    startTServer: startWSTServer,
    itForWS: it,
    itForUWS: it.skip,
    itForFastify: it.skip,
  },
  {
    tServer: 'uWebSockets.js' as const,
    startTServer: startUWSTServer,
    itForWS: it.skip,
    itForUWS: it,
    itForFastify: it.skip,
  },
  {
    tServer: 'fastify-websocket' as const,
    startTServer: startFastifyWSTServer,
    itForWS: it.skip,
    itForUWS: it.skip,
    itForFastify: it,
  },
];
