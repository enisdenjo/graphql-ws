/**
 *
 * server
 *
 */

import http from 'http';
import WebSocket from 'ws';
import { GraphQLSchema, subscribe } from 'graphql';
import { Disposable } from '../types';
import { GRAPHQL_WS_PROTOCOL } from '../protocol';
import { Message, MessageType, parseMessage } from '../message';
import { isObject, hasOwnObjectProperty, hasOwnStringProperty } from '../utils';

export interface ServerOptions {
  /**
   * The GraphQL schema on which
   * the opertaions will be executed
   * and validated against.
   */
  schema: GraphQLSchema;
  /**
   * Is the `subscribe` function
   * from GraphQL which is used to
   * execute the subscription operation
   * upon.
   */
  subscribe: typeof subscribe;
  /**
   * Is the connection callback called when the
   * client requests the connection initialisation
   * through the message `ConnectionInit`. The message
   * payload (`connectionParams` on the client) is
   * present in the `Context.connectionParams`.
   *
   * - Returning `true` from the callback will
   * allow the client to connect.
   *
   * - Returning `false` from the callback will
   * terminate the socket by dispatching the
   * close event `4403: Forbidden`.
   *
   * - Throwing an error from the callback will
   * terminate the socket by dispatching the
   * close event `4400: <error-message>`, where
   * the `<error-message>` is the message of the
   * thrown `Error`.
   */
  onConnect?: (
    ctx: Context,
    request: http.IncomingMessage,
  ) => Promise<boolean> | boolean;
  /**
   * The amount of time for which the
   * server will wait for `ConnectionInit` message.
   * Defaults to: **3 seconds**.
   *
   * If the wait timeout has passed and the client
   * has not sent the `ConnectionInit` message,
   * the server will terminate the socket by
   * dispatching a close event `4408: Connection initialisation timeout`
   */
  connectionInitWaitTimeout?: number;
}

interface Context {
  socket: WebSocket;
  connectionParams?: Record<string, unknown>;
}

export interface Server extends Disposable {
  webSocketServer: WebSocket.Server;
}

/**
 * Creates a protocol complient WebSocket GraphQL
 * subscription server. Read more about the protocol
 * in the PROTOCOL.md documentation file.
 */
export function createServer(
  _options: ServerOptions,
  websocketOptionsOrServer: WebSocket.ServerOptions | WebSocket.Server,
): Server {
  const webSocketServer =
    websocketOptionsOrServer instanceof WebSocket.Server
      ? websocketOptionsOrServer
      : new WebSocket.Server(websocketOptionsOrServer);

  function handleConnection(socket: WebSocket, _request: http.IncomingMessage) {
    if (
      socket.protocol === undefined ||
      socket.protocol !== GRAPHQL_WS_PROTOCOL ||
      (Array.isArray(socket.protocol) &&
        socket.protocol.indexOf(GRAPHQL_WS_PROTOCOL) === -1)
    ) {
      // 1002: Protocol Error
      socket.close(1002, 'Protocol Error');
      return;
    }

    const ctx = { socket };

    function errorOrCloseHandler(
      errorOrClose: WebSocket.ErrorEvent | WebSocket.CloseEvent,
    ) {
      if (isErrorEvent(errorOrClose)) {
        // TODO-db-200805 leaking sensitive information by sending the error message too?
        // 1011: Internal Error
        ctx.socket.close(1011, errorOrClose.message);
      }

      // TODO-db-200702 close all active subscriptions
    }

    socket.onerror = errorOrCloseHandler;
    socket.onclose = errorOrCloseHandler;
    socket.onmessage = makeOnMessage(ctx);
  }
  webSocketServer.on('connection', handleConnection);
  webSocketServer.on('error', (err) => {
    for (const client of webSocketServer.clients) {
      // report server errors by erroring out all clients with the same error
      client.emit('error', err);
    }
  });

  // Sends through a message only if the socket is open.
  function sendMessage<T extends MessageType>(
    ctx: Context,
    message: Message<T>,
    callback?: (err?: Error) => void,
  ) {
    return new Promise((resolve, reject) => {
      if (ctx.socket.readyState === WebSocket.OPEN) {
        ctx.socket.send(JSON.stringify(message), (err) => {
          if (callback) callback(err);
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      } else {
        if (callback) callback();
        resolve();
      }
    });
  }

  function makeOnMessage(ctx: Context) {
    return async function (event: WebSocket.MessageEvent) {
      let message: Message;
      try {
        message = parseMessage(event.data);
      } catch (err) {
        ctx.socket.close(4400, err.message);
        return;
      }

      switch (message.type) {
        case MessageType.ConnectionInit: {
          message as Message<MessageType.ConnectionInit>; // type inference
          await sendMessage<MessageType.ConnectionAck>(ctx, {
            type: MessageType.ConnectionAck,
          });
        }
        // TODO-db-200808 handle other message types
      }
    };
  }

  return {
    webSocketServer,
    dispose: async () => {
      for (const client of webSocketServer.clients) {
        // 1001: Going away
        client.close(1001, 'Going away');
      }

      webSocketServer.removeAllListeners();

      await new Promise((resolve, reject) =>
        webSocketServer.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

function isErrorEvent(obj: unknown): obj is WebSocket.ErrorEvent {
  return (
    isObject(obj) &&
    hasOwnObjectProperty(obj, 'error') &&
    hasOwnStringProperty(obj, 'message') &&
    hasOwnStringProperty(obj, 'type')
  );
}
