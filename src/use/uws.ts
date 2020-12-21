import type * as uws from 'uWebSockets.js';
import { makeServer, ServerOptions } from '../server';
import { Disposable } from '../types';

/**
 * The extra that will be put in the `Context`.
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: uws.WebSocket;

  /**
   * The initial HTTP request before the actual
   * socket and connection is established.
   */
  readonly request: uws.HttpRequest;
}

export interface UwsOptions {
  app: uws.TemplatedApp;
  path: string;
  config?: uws.WebSocketBehavior;
}

interface Client {
  messageHandler?: (data: string) => Promise<void>;
  closeHandler?: () => void;
  pingInterval?: NodeJS.Timeout | null;
  pongWaitTimeout?: NodeJS.Timeout | null;
}

export function useServer(
  options: ServerOptions<Extra>,
  uwsOptions: UwsOptions,
  /**
   * The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss))
   * to check that the link between the clients and the server is operating and to prevent the link
   * from being broken due to idling.
   *
   * @default 12 * 1000 // 12 seconds
   */
  keepAlive = 12 * 1000,
): Disposable {
  const isProd = process.env.NODE_ENV === 'production';
  const server = makeServer<Extra>(options);
  const clients: Map<uws.WebSocket, Client> = new Map();

  const { app, path, config } = uwsOptions;

  app.ws(path, {
    ...config,

    pong(socket) {
      const client = clients.get(socket);

      if (client?.pongWaitTimeout) {
        clearTimeout(client.pongWaitTimeout);
        client.pongWaitTimeout = null;
      }
    },

    upgrade(res, req, context) {
      res.upgrade(
        {
          upgradeReq: req,
        },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context,
      );
    },

    async open(socket) {
      const client: Client = {}
      const request = socket.upgradeReq as uws.HttpRequest;

      if (keepAlive > 0 && isFinite(keepAlive)) {
        client.pingInterval = setInterval(() => {
          // terminate the connection after pong wait has passed because the client is idle
          const pongWaitTimeout = setTimeout(() => {
            socket.close();
          }, keepAlive);

          clients.set(socket, {
            ...clients.get(socket),
            pongWaitTimeout
          });

          socket.ping();
        }, keepAlive);
      }

      client.closeHandler = server.opened(
        {
          protocol: request.getHeader('sec-websocket-protocol'),
          send(message) {
            if (clients.has(socket)) {
              socket.send(message, false, true);
            }
          },
          close(code, reason) {
            socket.end(code, reason);
          },
          onMessage(cb) {
            client.messageHandler = cb;
          },
        },
        {
          socket,
          request,
        },
      );

      clients.set(socket, client);
    },

    async message(socket, message) {
      const msg = Buffer.from(message).toString();
      const client = clients.get(socket);

      if (client?.messageHandler) {
        try {
          await client.messageHandler(msg);
        } catch (err) {
          socket.end(1011, isProd ? 'Internal Error' : err.message);
        }
      }
    },

    close(socket) {
      const client = clients.get(socket);

      if (!client) {
        return;
      }

      if (client.closeHandler) {
        client.closeHandler();
      }

      if (client.pingInterval) {
        clearTimeout(client.pingInterval);
      }

      if (client.pongWaitTimeout) {
        clearTimeout(client.pongWaitTimeout);
      }

      clients.delete(socket);
    },
  });

  return {
    dispose() {
      for (const [socket] of clients) {
        socket.end(1001, 'Going away');
      }
    }
  };
}
