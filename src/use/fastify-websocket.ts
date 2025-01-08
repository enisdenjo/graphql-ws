import type { FastifyRequest } from 'fastify';
import type * as fastifyWebsocket from 'fastify-websocket';
import { ConnectionInitMessage } from '../common';
import { ServerOptions } from '../server';
import { makeHandler as makeHandlerCurrent } from './@fastify/websocket';

/**
 * The extra that will be put in the `Context`.
 *
 * @deprecated Use `@fastify/websocket` instead.
 *
 * @category Server/fastify-websocket
 */
export interface Extra {
  /**
   * The underlying socket connection between the server and the client.
   * The WebSocket socket is located under the `socket` parameter.
   */
  readonly connection: fastifyWebsocket.SocketStream;
  /**
   * The initial HTTP upgrade request before the actual
   * socket and connection is established.
   */
  readonly request: FastifyRequest;
}

/**
 * Make a handler to use on a [fastify-websocket](https://github.com/fastify/fastify-websocket) route.
 * This is a basic starter, feel free to copy the code over and adjust it to your needs
 *
 * @deprecated Use `@fastify/websocket` instead.
 *
 * @category Server/fastify-websocket
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
): fastifyWebsocket.WebsocketHandler {
  // new handler can be reused, the semantics stayed the same
  return makeHandlerCurrent(options, keepAlive);
}
