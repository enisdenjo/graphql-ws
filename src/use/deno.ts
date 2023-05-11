import { makeServer, ServerOptions } from '../server';
import {
  DEPRECATED_GRAPHQL_WS_PROTOCOL,
  ConnectionInitMessage,
  CloseCode,
} from '../common';

/**
 * The extra that will be put in the `Context`.
 *
 * @category Server/deno
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: WebSocket;
}

/**
 * Use the server with [Deno](https://deno.com/).
 * This is a basic starter, feel free to copy the code over and adjust it to your needs.
 *
 * The keep-alive is set in `Deno.upgradeWebSocket` during the upgrade.
 *
 * @category Server/deno
 */
export function makeHandler<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(options: ServerOptions<P, Extra & Partial<E>>): (socket: WebSocket) => void {
  const server = makeServer(options);
  return (socket) => {
    socket.onerror = (err) => {
      console.error(
        'Internal error emitted on the WebSocket socket. ' +
          'Please check your implementation.',
        err,
      );
      socket.close(CloseCode.InternalServerError, 'Internal server error');
    };

    const closed = server.opened(
      {
        protocol: socket.protocol,
        send: (msg) => socket.send(msg),
        close: (code, reason) => socket.close(code, reason),
        onMessage: (cb) => {
          socket.onmessage = async (event) => {
            try {
              await cb(String(event));
            } catch (err) {
              console.error(
                'Internal error occurred during message handling. ' +
                  'Please check your implementation.',
                err,
              );
              socket.close(
                CloseCode.InternalServerError,
                'Internal server error',
              );
            }
          };
        },
      },
      { socket } as Extra & Partial<E>,
    );

    socket.onclose = (event) => {
      if (
        event.code === CloseCode.SubprotocolNotAcceptable &&
        socket.protocol === DEPRECATED_GRAPHQL_WS_PROTOCOL
      )
        console.warn(
          `Client provided the unsupported and deprecated subprotocol "${socket.protocol}" used by subscriptions-transport-ws.` +
            'Please see https://www.apollographql.com/docs/apollo-server/data/subscriptions/#switching-from-subscriptions-transport-ws.',
        );
      closed(event.code, event.reason);
    };
  };
}
