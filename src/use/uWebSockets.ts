import type * as uWS from 'uWebSockets.js';
import type http from 'http';
import { makeServer, ServerOptions } from '../server';

/**
 * The extra that will be put in the `Context`.
 *
 * @category Server/uWebSockets
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: uWS.WebSocket & { upgradeReq: Request };
  /**
   * The initial HTTP request before the actual
   * socket and connection is established.
   */
  readonly request: Request;
}

export interface Request {
  headers: http.IncomingHttpHeaders;
}

interface Client {
  pingInterval: NodeJS.Timeout | null;
  pongWaitTimeout: NodeJS.Timeout | null;
  handleMessage: (data: string) => Promise<void>;
  closed: (code: number, reason: string) => Promise<void>;
}

/**
 * Make the behaviour for using a [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) WebSocket server.
 * This is a basic starter, feel free to copy the code over and adjust it to your needs
 *
 * @category Server/uWebSockets
 */
export function makeBehavior<
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(
  options: ServerOptions<Extra & Partial<E>>,
  behavior: uWS.WebSocketBehavior = {},
  /**
   * The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss))
   * to check that the link between the clients and the server is operating and to prevent the link
   * from being broken due to idling.
   *
   * @default 12 * 1000 // 12 seconds
   */
  keepAlive = 12 * 1000,
): uWS.WebSocketBehavior {
  const isProd = process.env.NODE_ENV === 'production';
  const server = makeServer(options);
  const clients = new Map<uWS.WebSocket, Client>();

  let onDrain = () => {
    // gets called when backpressure drains
  };

  return {
    ...behavior,
    pong(...args) {
      behavior.pong?.(...args);
      const [socket] = args;

      const client = clients.get(socket);
      if (!client) throw new Error('Pong received for a missing client');

      if (client.pongWaitTimeout) {
        clearTimeout(client.pongWaitTimeout);
        client.pongWaitTimeout = null;
      }
    },
    upgrade(...args) {
      behavior.upgrade?.(...args);
      const [res, req, context] = args;
      const upgradeReq: Request = {
        headers: {},
      };

      req.forEach((key, value) => {
        upgradeReq.headers[key] = value;
      });

      res.upgrade(
        { upgradeReq },
        upgradeReq.headers['sec-websocket-key'] || '',
        upgradeReq.headers['sec-websocket-protocol'] || '',
        upgradeReq.headers['sec-websocket-extensions'] || '',
        context,
      );
    },
    open(...args) {
      behavior.open?.(...args);
      const socket = args[0] as uWS.WebSocket & { upgradeReq: Request };

      // prepare client object
      const client: Client = {
        pingInterval: null,
        pongWaitTimeout: null,
        handleMessage: () => {
          throw new Error('Message received before handler was registered');
        },
        closed: () => {
          throw new Error('Closed before handler was registered');
        },
      };

      client.closed = server.opened(
        {
          protocol: socket.upgradeReq.headers['sec-websocket-protocol'] || '',
          send: async (message) => {
            // the socket might have been destroyed in the meantime
            if (!clients.has(socket)) return;
            if (!socket.send(message))
              // if backpressure is built up wait for drain
              await new Promise<void>((resolve) => (onDrain = resolve));
          },
          close: (code, reason) => {
            // end socket in next tick making sure the client is registered
            setImmediate(() => {
              // the socket might have been destroyed before issuing a close
              if (clients.has(socket)) socket.end(code, reason);
            });
          },
          onMessage: (cb) => (client.handleMessage = cb),
        },
        { socket, request: socket.upgradeReq } as Extra & Partial<E>,
      );

      if (keepAlive > 0 && isFinite(keepAlive)) {
        client.pingInterval = setInterval(() => {
          // terminate the connection after pong wait has passed because the client is idle
          client.pongWaitTimeout = setTimeout(() => socket.close(), keepAlive);
          socket.ping();
        }, keepAlive);
      }

      clients.set(socket, client);
    },
    drain(...args) {
      behavior.drain?.(...args);
      onDrain();
    },
    async message(...args) {
      behavior.message?.(...args);
      const [socket, message] = args;

      const client = clients.get(socket);
      if (!client) throw new Error('Message received for a missing client');

      try {
        await client.handleMessage(Buffer.from(message).toString());
      } catch (err) {
        socket.end(1011, isProd ? 'Internal Error' : err.message);
      }
    },
    close(...args) {
      behavior.close?.(...args);
      const [socket, code, message] = args;

      const client = clients.get(socket);
      if (!client) throw new Error('Closing a missing client');

      if (client.pongWaitTimeout) clearTimeout(client.pongWaitTimeout);
      if (client.pingInterval) clearTimeout(client.pingInterval);
      client.closed(code, Buffer.from(message).toString());
      clients.delete(socket);
    },
  };
}
