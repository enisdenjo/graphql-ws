import type { Server as WebSocketServer } from 'ws';
import { makeServer, Server, ServerOptions } from '../server';
import { Disposable } from '../types';

/**
 * Creates a Protocol complient WebSocket GraphQL on
 * a [ws](https://github.com/websockets/ws) WebSocket server.
 */
export function createServer(
  options: ServerOptions,
  ws: WebSocketServer,
  /** Read documentation on `useServer`. */
  keepAlive?: number,
): Disposable {
  useServer(makeServer(options), ws, keepAlive);
  return {
    dispose: async () => {
      for (const client of ws.clients) {
        client.close(1001, 'Going away');
      }
      await new Promise((resolve, reject) =>
        ws.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

/**
 * Use the server on a [ws](https://github.com/websockets/ws) WebSocket server.
 */
export function useServer(
  server: Server,
  ws: WebSocketServer,
  /**
   * The timout between dispatched keep-alive messages. Internally uses the [WebSocket Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Pings_and_Pongs_The_Heartbeat_of_WebSockets))
   * to check that the link between the clients and the server is operating and to prevent the link
   * from being broken due to idling.
   *
   * @default 12 * 1000 // 12 seconds
   */
  keepAlive = 12 * 1000,
): void {
  const isProd = process.env.NODE_ENV === 'production';
  ws.on('connection', (socket) => {
    // keep alive through ping-pong messages
    let pongWait: NodeJS.Timeout | null = null;
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

    ws.on('error', (err) => {
      // catch the first thrown error and re-throw it once all clients have been notified
      let firstErr: Error | null = null;

      // report server errors by erroring out all clients with the same error
      for (const client of ws.clients) {
        try {
          client.emit('error', err);
        } catch (err) {
          firstErr = firstErr ?? err;
        }
      }

      if (firstErr) {
        throw firstErr;
      }
    });

    server.opened({
      protocol: socket.protocol,
      send: (data) =>
        new Promise((resolve, reject) => {
          socket.send(data, (err) => (err ? reject(err) : resolve()));
        }),
      close: (code, reason) => socket.close(code, reason),
      onMessage: (cb) =>
        socket.on('message', async (event) => {
          try {
            await cb(event.toString());
          } catch (err) {
            socket.close(1011, isProd ? 'Internal Error' : err.message);
          }
        }),
      onClose: (cb) =>
        socket.on('close', () => {
          if (pingInterval) clearInterval(pingInterval);
          cb();
        }),
    });
  });
}
