import type { WebSocket, WebsocketHandler } from '@fastify/websocket';
import type { FastifyRequest } from 'fastify';
import {
  CloseCode,
  ConnectionInitMessage,
  DEPRECATED_GRAPHQL_WS_PROTOCOL,
} from '../../common';
import { handleProtocols, makeServer, ServerOptions } from '../../server';
import { limitCloseReason } from '../../utils';

/**
 * The extra that will be put in the `Context`.
 *
 * @category Server/@fastify/websocket
 */
export interface Extra {
  /**
   * The underlying socket connection between the server and the client.
   * The WebSocket socket is located under the `socket` parameter.
   */
  readonly socket: WebSocket;
  /**
   * The initial HTTP upgrade request before the actual
   * socket and connection is established.
   */
  readonly request: FastifyRequest;
}

/**
 * Make a handler to use on a [@fastify/websocket](https://github.com/fastify/fastify-websocket) route.
 * This is a basic starter, feel free to copy the code over and adjust it to your needs
 *
 * @category Server/@fastify/websocket
 */
export function makeHandler<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
>(
  options: ServerOptions<P, Extra & Partial<E>>,
  /**
   * The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#pings_and_pongs_the_heartbeat_of_websockets)
   * to check that the link between the clients and the server is operating and to prevent the link
   * from being broken due to idling.
   *
   * @default 12_000 // 12 seconds
   */
  keepAlive = 12_000,
): WebsocketHandler {
  const isProd = process.env.NODE_ENV === 'production';
  const server = makeServer(options);

  // we dont have access to the fastify-websocket server instance yet,
  // register an error handler on first connection ONCE only
  let handlingServerEmittedErrors = false;

  return function handler(socket, request) {
    // might be too late, but meh
    this.websocketServer.options.handleProtocols = handleProtocols;

    // handle server emitted errors only if not already handling
    if (!handlingServerEmittedErrors) {
      handlingServerEmittedErrors = true;
      this.websocketServer.once('error', (err: unknown) => {
        console.error(
          'Internal error emitted on the WebSocket server. ' +
            'Please check your implementation.',
          err,
        );

        // catch the first thrown error and re-throw it once all clients have been notified
        let firstErr: unknown = null;

        // report server errors by erroring out all clients with the same error
        for (const client of this.websocketServer.clients) {
          try {
            client.close(
              CloseCode.InternalServerError,
              isProd
                ? 'Internal server error'
                : limitCloseReason(
                    err instanceof Error ? err.message : String(err),
                    'Internal server error',
                  ),
            );
          } catch (err) {
            firstErr = firstErr ?? err;
          }
        }

        if (firstErr) throw firstErr;
      });
    }

    // used as listener on two streams, prevent superfluous calls on close
    let emittedErrorHandled = false;
    function handleEmittedError(err: Error) {
      if (emittedErrorHandled) return;
      emittedErrorHandled = true;
      console.error(
        'Internal error emitted on a WebSocket socket. ' +
          'Please check your implementation.',
        err,
      );
      socket.close(
        CloseCode.InternalServerError,
        isProd
          ? 'Internal server error'
          : limitCloseReason(
              err instanceof Error ? err.message : String(err),
              'Internal server error',
            ),
      );
    }

    socket.once('error', handleEmittedError);

    // keep alive through ping-pong messages
    let pongWait: ReturnType<typeof setTimeout> | null = null;
    const pingInterval =
      keepAlive > 0 && isFinite(keepAlive)
        ? setInterval(() => {
            // ping pong on open sockets only
            if (socket.readyState === socket.OPEN) {
              // terminate the connection after pong wait has passed because the client is idle
              pongWait = setTimeout(() => {
                socket.terminate();
              }, keepAlive);

              // listen for client's pong and stop socket termination
              socket.once('pong', () => {
                if (pongWait) {
                  clearTimeout(pongWait);
                  pongWait = null;
                }
              });

              socket.ping();
            }
          }, keepAlive)
        : null;

    const closed = server.opened(
      {
        protocol: socket.protocol,
        send: (data) =>
          new Promise((resolve, reject) => {
            if (socket.readyState !== socket.OPEN) return resolve();
            socket.send(data, (err) => (err ? reject(err) : resolve()));
          }),
        close: (code, reason) => socket.close(code, reason),
        onMessage: (cb) =>
          socket.on('message', async (event) => {
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
                isProd
                  ? 'Internal server error'
                  : limitCloseReason(
                      err instanceof Error ? err.message : String(err),
                      'Internal server error',
                    ),
              );
            }
          }),
      },
      { socket, request } as Extra & Partial<E>,
    );

    socket.once('close', (code, reason) => {
      if (pongWait) clearTimeout(pongWait);
      if (pingInterval) clearInterval(pingInterval);
      if (
        !isProd &&
        code === CloseCode.SubprotocolNotAcceptable &&
        socket.protocol === DEPRECATED_GRAPHQL_WS_PROTOCOL
      )
        console.warn(
          `Client provided the unsupported and deprecated subprotocol "${socket.protocol}" used by subscriptions-transport-ws.` +
            'Please see https://www.apollographql.com/docs/apollo-server/data/subscriptions/#switching-from-subscriptions-transport-ws.',
        );
      closed(code, String(reason));
    });
  };
}
