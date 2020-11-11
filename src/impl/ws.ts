import { Server as WebSocketServer } from 'ws';
import { Server } from '../server';

/**
 * Use the server on a [ws](https://github.com/websockets/ws) WebSocket server.
 */
export function useServer(server: Server): WebSocketServer {
  const wsServer = new WebSocketServer();
  wsServer.on('connection', (socket) => {
    // server calls `waitForClose` later, it will resolve immediately
    const waitForClose = new Promise<void>(
      (resolve) => (socket.onclose = () => resolve()),
    );

    server.opened({
      protocol: socket.protocol,
      send: (data) =>
        new Promise((resolve, reject) => {
          socket.send(data, (err) => (err ? reject(err) : resolve()));
        }),
      close: (code, reason) => socket.close(code, reason),
      onMessage: (cb) => socket.on('message', (event) => cb(event.toString())),
      waitForClose: () => waitForClose,
    });
  });
  return wsServer;
}
