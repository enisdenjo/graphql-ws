import type { Server as WebSocketServer } from 'ws';
import { Server } from '../server';

const keepAlive = 12 * 1000; // 12 seconds

/**
 * Use the server on a [ws](https://github.com/websockets/ws) WebSocket server.
 */
export function useServer(server: Server, ws: WebSocketServer): void {
  ws.on('connection', (socket) => {
    // keep alive through ping-pong messages
    let pongWait: NodeJS.Timeout | null = null;
    const pingInterval = setInterval(() => {
      // ping pong on open sockets only
      if (socket.readyState === WebSocket.OPEN) {
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
    }, keepAlive);

    server.opened({
      protocol: socket.protocol,
      send: (data) =>
        new Promise((resolve, reject) => {
          socket.send(data, (err) => (err ? reject(err) : resolve()));
        }),
      close: (code, reason) => socket.close(code, reason),
      onMessage: (cb) => socket.on('message', (event) => cb(event.toString())),
      onClose: (cb) =>
        socket.on('close', () => {
          clearInterval(pingInterval);
          cb();
        }),
    });
  });
}
