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

    async function errorHandler(error: Error) {
      await sendMessage(ctx, {
        type: MessageType.ConnectionError,
        payload: new GraphQLError(error.message),
      });

      // 1011: Internal error is an unexpected condition prevented the request from being fulfilled
      ctx.socket.close(1011);

      // TODO-db-200702 close all active subscriptions
    }

    socket.on('error', errorHandler);
    // socket.on('close', closeHandler); // TODO-db-200702 implement handler
    socket.on('message', makeOnMessage(ctx));
  }
  server.on('connection', handleConnection);

  // Sends through a message only if the socket is open.
  function sendMessage(ctx: Context, message: Message) {
    return new Promise((resolve, reject) => {
      if (ctx.socket.readyState === WebSocket.OPEN) {
        ctx.socket.send(JSON.stringify(message), (err) =>
          err ? reject(err) : resolve(),
        );
      } else {
        resolve();
      }
    });
  }

  function makeOnMessage(ctx: Context) {
    return async function (data: WebSocket.Data) {
      let message: Message;
      try {
        message = JSON.parse(data as string);
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
