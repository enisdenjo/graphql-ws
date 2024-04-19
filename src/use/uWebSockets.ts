import type * as uWS from 'uWebSockets.js';
import type http from 'http';
import { handleProtocols, makeServer, ServerOptions } from '../server';
import { ConnectionInitMessage, CloseCode } from '../common';
import { limitCloseReason } from '../utils';

/**
 * The extra that will be put in the `Context`.
 *
 * @category Server/uWebSockets
 */
export interface Extra extends UpgradeData {
  /**
   * The actual socket connection between the server and the client
   * with the upgrade data.
   */
  readonly socket: uWS.WebSocket<unknown> & UpgradeData;
}

/**
 * Data acquired during the HTTP upgrade callback from uWS.
 *
 * @category Server/uWebSockets
 */
export interface UpgradeData {
  /**
   * The initial HTTP upgrade request before the actual
   * socket and connection is established.
   *
   * uWS's request is stack allocated and cannot be accessed
   * from outside of the internal upgrade; therefore, the persisted
   * request holds the relevant values extracted from the uWS's request
   * while it is accessible.
   */
  readonly persistedRequest: PersistedRequest;
}

/**
 * The initial HTTP upgrade request before the actual
 * socket and connection is established.
 *
 * uWS's request is stack allocated and cannot be accessed
 * from outside of the internal upgrade; therefore, the persisted
 * request holds relevant values extracted from the uWS's request
 * while it is accessible.
 *
 * @category Server/uWebSockets
 */
export interface PersistedRequest {
  method: string;
  url: string;
  /** The raw query string (after the `?` sign) or empty string. */
  query: string;
  headers: http.IncomingHttpHeaders;
}

interface Client {
  pingInterval: ReturnType<typeof setInterval> | null;
  pongWaitTimeout: ReturnType<typeof setTimeout> | null;
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
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(
  options: ServerOptions<P, Extra & Partial<E>>,
  behavior: uWS.WebSocketBehavior<unknown> = {},
  /**
   * The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss))
   * to check that the link between the clients and the server is operating and to prevent the link
   * from being broken due to idling.
   *
   * @default 12_000 // 12 seconds
   */
  keepAlive = 12_000,
): uWS.WebSocketBehavior<unknown> {
  const isProd = process.env.NODE_ENV === 'production';
  const server = makeServer(options);
  const clients = new Map<uWS.WebSocket<unknown>, Client>();

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

      const headers: http.IncomingHttpHeaders = {};
      req.forEach((key, value) => {
        headers[key] = value;
      });

      res.upgrade<UpgradeData>(
        {
          persistedRequest: {
            method: req.getMethod(),
            url: req.getUrl(),
            query: req.getQuery(),
            headers,
          },
        },
        req.getHeader('sec-websocket-key'),
        handleProtocols(req.getHeader('sec-websocket-protocol')) ||
          new Uint8Array(),
        req.getHeader('sec-websocket-extensions'),
        context,
      );
    },
    open(...args) {
      behavior.open?.(...args);
      const socket = args[0] as uWS.WebSocket<unknown> & UpgradeData;
      const persistedRequest = socket.persistedRequest;

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
          protocol:
            handleProtocols(
              persistedRequest.headers['sec-websocket-protocol'] || '',
            ) || '',
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
        { socket, persistedRequest } as Extra & Partial<E>,
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
        console.error(
          'Internal error occurred during message handling. ' +
            'Please check your implementation.',
          err,
        );
        socket.end(
          CloseCode.InternalServerError,
          isProd
            ? 'Internal server error'
            : limitCloseReason(
                err instanceof Error ? err.message : String(err),
                'Internal server error',
              ),
        );
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
