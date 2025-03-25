import { defineHooks, type Message, type WSError, type Peer } from 'crossws';
import { CloseCode, type ConnectionInitMessage } from '../common';
import { handleProtocols, makeServer, type ServerOptions } from '../server';
import { limitCloseReason } from '../utils';

/**
 * The extra that will be put in the `Context`.
 *
 * @category Server/bun
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: Peer['websocket'];
}

// TODO: Wait for https://github.com/unjs/crossws/pull/149 to merge
type UpgradeRequest = Request | {
  url: string;
  headers: Headers;
};
type MaybePromise<T> = T | Promise<T>;

interface Hooks {
    /** Upgrading */
    /**
     *
     * @param request
     * @throws {Response}
     */
    upgrade: (request: UpgradeRequest & {
        context: Peer["context"];
    }) => MaybePromise<Response | ResponseInit | void>;
    /** A message is received */
    message: (peer: Peer, message: Message) => MaybePromise<void>;
    /** A socket is opened */
    open: (peer: Peer) => MaybePromise<void>;
    /** A socket is closed */
    close: (peer: Peer, details: {
        code?: number;
        reason?: string;
    }) => MaybePromise<void>;
    /** An error occurs */
    error: (peer: Peer, error: WSError) => MaybePromise<void>;
}

export function makeHooks<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(options: ServerOptions<P, Extra & Partial<E>> & { isProd?: boolean }) {
  const isProd =
    typeof options.isProd === 'boolean'
      ? options.isProd
      : process.env.NODE_ENV === 'production';
  const server = makeServer(options);

  interface Client {
    handleMessage: (data: string) => Promise<void>;
    closed: (code: number, reason: string) => Promise<void>;
  }

  const clients = new WeakMap<Peer, Client>();

  return defineHooks<Partial<Hooks>>({
    open(peer) {
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
          protocol:
            handleProtocols(
              peer.request.headers.get('sec-websocket-protocol') ?? '',
            ) || '',
          send: async (message) => {
            // ws might have been destroyed in the meantime, send only if exists
            if (clients.has(peer)) {
              peer.send(message);
            }
          },
          close: (code, reason) => {
            if (clients.has(peer)) {
              peer.close(code, reason);
            }
          },
          onMessage: (cb) => {
            client.handleMessage = cb;
            return cb;
          },
        },
        { socket: peer.websocket } as Extra & Partial<E>,
      );

      clients.set(peer, client);
    },
    async message(peer, message) {
      const client = clients.get(peer);
      if (!client) throw new Error('Message received for a missing client');

      try {
        await client.handleMessage(message.text());
      } catch (err) {
        console.error(
          'Internal error occurred during message handling. ' +
            'Please check your implementation.',
          err,
        );
        peer.close(
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
    close(peer, details) {
      const client = clients.get(peer);
      if (!client) throw new Error('Closing a missing client');

      client.closed(
        details?.code ?? 1000,
        details.reason || 'Connection closed',
      );
      clients.delete(peer);
    },
    error(peer, error) {
      console.error(
        'Internal error emitted on the WebSocket socket. ' +
          'Please check your implementation.',
        error,
      );
      peer.close(CloseCode.InternalServerError, 'Internal server error');
    },
  });
}
