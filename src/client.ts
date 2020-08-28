/**
 *
 * GraphQL over WebSocket Protocol
 *
 * Check out the `PROTOCOL.md` document for the transport specification.
 *
 */

import { Sink, UUID, Disposable } from './types';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';
import {
  MessageType,
  parseMessage,
  stringifyMessage,
  SubscribePayload,
} from './message';
import { noop } from './utils';

/** Configuration used for the `create` client function. */
export interface ClientOptions {
  /** URL of the GraphQL server to connect. */
  url: string;
  /** Optional parameters that the client specifies when establishing a connection with the server. */
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
}

export interface Client extends Disposable {
  /**
   * Subscribes through the WebSocket following the config parameters. It
   * uses the `sink` to emit received data or errors. Returns a _cleanup_
   * function used for dropping the subscription and cleaning stuff up.
   */
  subscribe<T = unknown>(payload: SubscribePayload, sink: Sink<T>): () => void;
}

/** The nifty internal socket state manager: Socky 🧦. */
function createSocky() {
  let socket: WebSocket | undefined;
  let state = {
    connecting: false,
    connected: false,
    disconnecting: false,
  };

  return {
    async beginConnecting(): Promise<boolean> {
      if (state.connecting) {
        let waitedTimes = 0;
        while (state.connecting) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          // 100ms * 50 = 5sec
          if (waitedTimes >= 50) {
            throw new Error('Waited 10 seconds but socket never connected');
          }
          waitedTimes++;
        }
      }

      if (state.disconnecting) {
        let waitedTimes = 0;
        while (state.disconnecting) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          // 100ms * 50 = 5sec
          if (waitedTimes >= 50) {
            throw new Error('Waited 10 seconds but socket never disconnected');
          }
          waitedTimes++;
        }
      }

      // the state could've changed while waiting for `connecting` or
      // `disconnecting`, if it did - start connecting again
      if (state.connecting || state.disconnecting) {
        return await this.beginConnecting();
      }

      // the socket could've connected in the meantime
      if (state.connected) {
        return false;
      }

      state = { ...state, connecting: true };
      return true;
    },
    connected(connectedSocket: WebSocket) {
      socket = connectedSocket;
      state = { ...state, connected: true, connecting: false };
    },
    registerMessageListener(
      listener: (event: MessageEvent) => void,
    ): Disposable {
      if (!socket) {
        throw new Error(
          'Illegal socket access while registering a message listener. Has Socky been prepared?',
        );
      }

      socket.addEventListener('message', listener);
      return {
        dispose: () => {
          // we use the internal socket here because the connection
          // might have been lost before the deregistration is requested
          if (socket) {
            socket.removeEventListener('message', listener);
          }
        },
      };
    },
    send(data: string) {
      // TODO-db-200827 decide if accessing missing socket during send is illegal
      if (!socket) {
        throw new Error(
          'Illegal socket access while sending a message. Preparation skipped?',
        );
      }

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    },
    dispose() {
      if (!state.disconnecting) {
        state = { ...state, disconnecting: true };

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Normal Closure');
        }
        socket = undefined;

        state = { ...state, disconnecting: false, connected: false };
      }
    },
  };
}

/** Creates a disposable GQL subscriptions client. */
export function createClient(options: ClientOptions): Client {
  const { url, connectionParams } = options;

  const pendingSinks: Record<UUID, Sink> = {};
  const subscribedSinks: Record<UUID, Sink> = {};

  const socky = createSocky();
  async function prepare(): Promise<void> {
    if (await socky.beginConnecting()) {
      return new Promise((resolve, reject) => {
        let done = false;
        const socket = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);

        /**
         * `onerror` handler is unnecessary because even if an error occurs, the `onclose` handler will be called
         *
         * From: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
         * > If an error occurs while attempting to connect, first a simple event with the name error is sent to the
         * > WebSocket object (thereby invoking its onerror handler), and then the CloseEvent is sent to the WebSocket
         * > object (thereby invoking its onclose handler) to indicate the reason for the connection's closing.
         */

        socket.onclose = (closeEvent) => {
          socky.dispose();

          if (closeEvent.code === 1000 || closeEvent.code === 1001) {
            // close event `1000: Normal Closure` is ok and so is `1001: Going Away` (maybe the server is restarting)
            // complete only subscribed sinks because pending ones want a new connection
            Object.entries(subscribedSinks).forEach(([, sink]) =>
              sink.complete(),
            );
          } else {
            // all other close events are considered erroneous for all sinks

            // reading the `CloseEvent.reason` can either throw or empty the whole error message
            // (if trying to pass the reason in the `Error` message). having this in mind,
            // simply let the user handle the close event...
            Object.entries(pendingSinks).forEach(([, sink]) =>
              sink.error(closeEvent),
            );
            Object.entries(subscribedSinks).forEach(([, sink]) =>
              sink.error(closeEvent),
            );
          }

          if (!done) {
            done = true;
            reject(closeEvent);
          }
        };

        socket.onopen = () => {
          // as soon as the socket opens, send the connection initalisation request
          socket.send(
            stringifyMessage<MessageType.ConnectionInit>({
              type: MessageType.ConnectionInit,
              payload:
                typeof connectionParams === 'function'
                  ? connectionParams()
                  : connectionParams,
            }),
          );
        };

        socket.addEventListener('message', handleMessage);
        function handleMessage({ data }: MessageEvent) {
          try {
            const message = parseMessage(data);
            if (message.type !== MessageType.ConnectionAck) {
              throw new Error(
                `First message cannot be of type ${message.type}`,
              );
            }

            socky.connected(socket);
            if (!done) {
              done = true;
              resolve();
            }
          } catch (err) {
            socky.dispose();

            Object.entries(pendingSinks).forEach(([, sink]) => sink.error(err));
            Object.entries(subscribedSinks).forEach(([, sink]) =>
              sink.error(err),
            );
            if (!done) {
              done = true;
              reject(err);
            }
          } finally {
            socket.removeEventListener('message', handleMessage);
          }
        }
      });
    }
  }

  return {
    subscribe: (payload, sink) => {
      const uuid = generateUUID();
      if (pendingSinks[uuid] || subscribedSinks[uuid]) {
        sink.error(new Error(`Sink with ID ${uuid} already registered`));
        return noop;
      }
      pendingSinks[uuid] = sink;

      let messageListener: Disposable | undefined,
        disposed = false;
      prepare()
        .then(() => {
          delete pendingSinks[uuid];

          // the sink might have been disposed before the socket became ready
          if (disposed) {
            return;
          }

          subscribedSinks[uuid] = sink;
          messageListener = socky.registerMessageListener(({ data }) => {
            const message = parseMessage(data);
            switch (message.type) {
              case MessageType.Next: {
                if (message.id === uuid) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sink.next(message.payload as any);
                }
                break;
              }
              case MessageType.Error: {
                if (message.id === uuid) {
                  sink.error(message.payload);
                }
                break;
              }
              case MessageType.Complete: {
                if (message.id === uuid) {
                  sink.complete();
                }
                break;
              }
            }
          });

          socky.send(
            stringifyMessage<MessageType.Subscribe>({
              id: uuid,
              type: MessageType.Subscribe,
              payload,
            }),
          );
        })
        .catch(sink.error);

      return () => {
        disposed = true;

        // having a message listener indicates that prepare has resolved
        if (messageListener) {
          messageListener.dispose();
          socky.send(
            stringifyMessage<MessageType.Complete>({
              id: uuid,
              type: MessageType.Complete,
            }),
          );
        }

        sink.complete();
        delete pendingSinks[uuid];
        delete subscribedSinks[uuid];

        if (Object.entries(subscribedSinks).length === 0) {
          // dispose of socky if no subscribers are left
          socky.dispose();
        }
      };
    },
    dispose: async () => {
      // TODO-db-200817 complete or error? the sinks should be completed BEFORE the client gets disposed
      Object.entries(pendingSinks).forEach(([, sink]) => sink.complete());
      Object.keys(pendingSinks).forEach((uuid) => {
        delete pendingSinks[uuid];
      });
      Object.entries(subscribedSinks).forEach(([, sink]) => {
        sink.complete();
      });
      Object.keys(subscribedSinks).forEach((uuid) => {
        delete subscribedSinks[uuid];
      });

      // bye bye 👋
      socky.dispose();
    },
  };
}

/** Generates a new v4 UUID. Reference: https://stackoverflow.com/a/2117523/709884 */
function generateUUID(): UUID {
  if (!window.crypto) {
    // fallback to Math.random when crypto is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (
      c,
    ) {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (s) => {
    const c = Number.parseInt(s, 10);
    return (
      c ^
      (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16);
  });
}
