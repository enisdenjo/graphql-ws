/**
 *
 * server
 *
 */

import http from 'http';
import WebSocket from 'ws';
import { GraphQLSchema, subscribe, GraphQLError } from 'graphql';
import { Disposable } from '../types';
import { GRAPHQL_WS_PROTOCOL } from '../protocol';
import { Message, MessageType, isMessage } from '../message';

export interface ServerOptions {
  rootValue?: any;
  schema?: GraphQLSchema;
  subscribe?: typeof subscribe;
}

interface Context {
  socket: WebSocket;
}

export function createServer(
  _options: ServerOptions,
  websocketOptionsOrServer: WebSocket.ServerOptions | WebSocket.Server,
): Disposable {
  const server =
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
      // 1002: Protocol error
      socket.close(1002);
      return;
    }

    const ctx = { socket };

    function errorOrCloseHandler(
      errorOrClose: WebSocket.ErrorEvent | WebSocket.CloseEvent,
    ) {
      if (isErrorEvent(errorOrClose)) {
        sendMessage(
          ctx,
          {
            type: MessageType.ConnectionError,
            payload: new GraphQLError(errorOrClose.message),
          },
          () => {
            // 1011: Internal Error
            ctx.socket.close(1011);
          },
        );
      }

      // TODO-db-200702 close all active subscriptions
    }

    socket.onerror = errorOrCloseHandler;
    socket.onclose = errorOrCloseHandler;
    socket.onmessage = makeOnMessage(ctx);
  }
  server.on('connection', handleConnection);

  // Sends through a message only if the socket is open.
  function sendMessage(
    ctx: Context,
    message: Message,
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
        message = JSON.parse(event.data as string);
        if (!isMessage(message)) {
          throw new Error('Invalid message');
        }
      } catch (err) {
        await sendMessage(ctx, {
          type: MessageType.ConnectionError,
          payload: new GraphQLError(err.message),
        });
        return;
      }

      switch (message.type) {
        case MessageType.ConnectionInit: {
          await sendMessage(ctx, {
            type: MessageType.ConnectionAck,
          });
        }
      }
    };
  }

  return {
    dispose: async () => {
      for (const client of server.clients) {
        // 1001: Going away
        client.close(1001, 'Going away');
      }

      server.removeAllListeners();

      await new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}

function isErrorEvent(obj: unknown): obj is WebSocket.ErrorEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if ('error' in obj && 'message' in obj && 'type' in obj) {
    return true;
  }
  return false;
}
