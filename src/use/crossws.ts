import { defineHooks, type Peer } from 'crossws';
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

interface Client {
  /**
   * Clients may send messages through the socket. This function can be called to handle those incoming messages.
   */
  handleIncomingMessage: (data: string) => Promise<void>;
  /**
   * When a clients socket is closed, the graphql server wants to be notified. This function can be called to do that.
   */
  signalClosure: (code: number, reason: string) => Promise<void>;
}

export function makeHooks<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(
  options: ServerOptions<P, Extra & Partial<E>> & {
    /**
     * If the server is running in production. Defaults to read from `process.env.NODE_ENV`.
     * In production the server will not send error messages whichmight contain sensitive info to the client.
     */
    isProd?: boolean;
  },
) {
  const isProd =
    typeof options.isProd === 'boolean'
      ? options.isProd
      : process.env.NODE_ENV === 'production';
  const server = makeServer(options);

  const clients = new WeakMap<Peer, Client>();

  return defineHooks({
    open(peer) {
      const client: Client = {
        handleIncomingMessage: () => {
          throw new Error('Message received before handler was registered');
        },
        signalClosure: () => {
          throw new Error('Closed before handler was registered');
        },
      };
      client.signalClosure = server.opened(
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
            client.handleIncomingMessage = cb;
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
        await client.handleIncomingMessage(message.text());
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

      client.signalClosure(
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
