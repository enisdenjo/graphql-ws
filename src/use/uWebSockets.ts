import type * as uWS from 'uWebSockets.js';
import { makeServer, ServerOptions } from '../server';

/**
 * The extra that will be put in the `Context`.
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: uWS.WebSocket;
  /**
   * The initial HTTP request before the actual
   * socket and connection is established.
   */
  readonly request: uWS.HttpRequest;
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
 */
export function makeBehavior(
  options: ServerOptions<Extra>,
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
  const server = makeServer<Extra>(options);
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

      res.upgrade(
        { upgradeReq: req },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context,
      );
    },
    open(...args) {
      behavior.open?.(...args);
      const [socket] = args;

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

      const request = socket.upgradeReq as uWS.HttpRequest;
      client.closed = server.opened(
        {
          protocol: request.getHeader('sec-websocket-protocol'),
          send: async (message) => {
            // send to available/open clients only
            if (!clients.has(socket)) return;

            if (!socket.send(message))
              // if backpressure is built up wait for drain
              await new Promise<void>((resolve) => (onDrain = resolve));
          },
          close: (code, reason) => {
            socket.end(code, reason);
          },
          onMessage: (cb) => (client.handleMessage = cb),
        },
        { socket, request },
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
