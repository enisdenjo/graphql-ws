import type * as uws from 'uWebSockets.js'
import { makeServer, ServerOptions } from '../server';
// import { Disposable } from '../types';

/**
 * The extra that will be put in the `Context`.
 */
export interface Extra {
  /**
   * The actual socket connection between the server and the client.
   */
  readonly socket: uws.WebSocket;

  /**
   * The initial HTTP request before the actual
   * socket and connection is established.
   */
  readonly request: uws.HttpRequest;
}

export interface UwsOptions {
  app: uws.TemplatedApp
  path: string,
  config?: uws.WebSocketBehavior
}

export function useServer(
  options: ServerOptions<Extra>,
  uwsOptions: UwsOptions,
  /**
   * The timout between dispatched keep-alive messages. Internally uses the [ws Ping and Pongs]((https://developer.mozilla.org/en-US/docs/Web/API/wss_API/Writing_ws_servers#Pings_and_Pongs_The_Heartbeat_of_wss))
   * to check that the link between the clients and the server is operating and to prevent the link
   * from being broken due to idling.
   *
   * @default 12 * 1000 // 12 seconds
   */
  keepAlive = 12 * 1000
) {
  const isProd = process.env.NODE_ENV === 'production'
  const server = makeServer<Extra>(options)
  const socketMessageHandlers: Map<
    uws.WebSocket,
    (data: string) => Promise<void>
  > = new Map()
  const socketCloseHandlers: Map<uws.WebSocket, () => void> = new Map()
  const pingIntervals: Map<uws.WebSocket, NodeJS.Timeout> = new Map()
  const pongWaitIntervals: Map<uws.WebSocket, NodeJS.Timeout> = new Map()
  
  const { app, path, config } = uwsOptions

  app.ws(path, {
    ...config,

    pong(socket) {
      const interval = pongWaitIntervals.get(socket)

      if (interval) {
        clearTimeout(interval)
        pongWaitIntervals.delete(socket)
      }
    },

    upgrade(res, req, context) {
      res.upgrade(
        {
          upgradeReq: req
        },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context
      )
    },

    async open(socket) {
      const request = socket.upgradeReq as uws.HttpRequest

      if (keepAlive > 0 && isFinite(keepAlive)) {
        const pingInterval = setInterval(() => {
          // terminate the connection after pong wait has passed because the client is idle
          const pongWaitInterval = setTimeout(() => {
            socket.close()
          }, keepAlive)

          pongWaitIntervals.set(socket, pongWaitInterval)
          socket.ping()
        }, keepAlive)

        pingIntervals.set(socket, pingInterval)
      }

      const closed = server.opened(
        {
          protocol: request.getHeader('sec-websocket-protocol'),
          send(message) {
            if (socketCloseHandlers.has(socket)) {
              socket.send(message, false, true)
            }
          },
          close(code, reason) {
            socket.end(code, reason)
          },
          onMessage(cb) {
            socketMessageHandlers.set(socket, cb)
          }
        },
        {
          socket,
          request
        }
      )

      socketCloseHandlers.set(socket, closed)
    },

    async message(socket, message) {
      const msg = Buffer.from(message).toString()
      const cb = socketMessageHandlers.get(socket)

      if (cb) {
        try {
          await cb(msg)
        } catch (err) {
          socket.end(1011, isProd ? 'Internal Error' : err.message)
        }
      }
    },

    close(socket) {
      const close = socketCloseHandlers.get(socket)

      if (close) {
        close()
      }

      socketCloseHandlers.delete(socket)
      socketMessageHandlers.delete(socket)

      const pingInterval = pingIntervals.get(socket)

      if (pingInterval) {
        clearTimeout(pingInterval)
        pingIntervals.delete(socket)
      }

      const pongWaitInterval = pongWaitIntervals.get(socket)

      if (pongWaitInterval) {
        clearTimeout(pongWaitInterval)
        pongWaitIntervals.delete(socket)
      }
    }
  })
}
