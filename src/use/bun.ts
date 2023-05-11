/// <reference types="bun-types" />

import type { WebSocketHandler, ServerWebSocket } from 'bun';
import { ConnectionInitMessage } from '../common';
import { makeServer, ServerOptions } from '../server';

/**
 * The extra that will be put in the `Context`.
 *
 * @category Server/bun
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: ServerWebSocket;
}

/**
 * Use the server with [Bun](https://bun.sh/).
 * This is a basic starter, feel free to copy the code over and adjust it to your needs
 *
 * @category Server/bun
 */
export function makeHandler<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(options: ServerOptions<P, Extra & Partial<E>>): WebSocketHandler {
  const server = makeServer(options);

  interface Client {
    handleMessage: (data: string) => Promise<void>;
    closed: (code: number, reason: string) => Promise<void>;
  }
  const clients = new WeakMap<ServerWebSocket, Client>();

  return {
    open(ws) {
      const client: Client = {
        handleMessage: () => {
          throw new Error('Message received before handler was registered');
        },
        closed: () => {
          throw new Error('Closed before handler was registered');
        },
      };

      client.closed = server.opened(
        {
          protocol: 'graphql-transport-ws', // TODO: read actual
          send: async (message) => {
            // ws might have been destroyed in the meantime, send only if exists
            if (clients.has(ws)) {
              ws.sendText(message);
            }
          },
          close: (code, reason) => {
            if (clients.has(ws)) {
              ws.close(code, reason);
            }
          },
          onMessage: (cb) => (client.handleMessage = cb),
        },
        { socket: ws } as Extra & Partial<E>,
      );

      clients.set(ws, client);
    },
    message(ws, message) {
      const client = clients.get(ws);
      if (!client) throw new Error('Message received for a missing client');
      return client.handleMessage(String(message));
    },
    close(ws, code, message) {
      const client = clients.get(ws);
      if (!client) throw new Error('Closing a missing client');
      return client.closed(code, message);
    },
  };
}
