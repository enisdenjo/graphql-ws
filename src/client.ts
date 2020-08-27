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
  let socket: WebSocket | null;
  let state = {
    connecting: false,
    connected: false,
    disconnecting: false,
  };

  return {
    async shouldConnect(): Promise<boolean> {
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
        // state.connecting === false
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
        // state.disconnecting === false
      }

      // the state could've changed while waitinf for `connecting` or `disconnecting`, if it did - wait more...
      if (state.connecting || state.disconnecting) {
        return await this.shouldConnect();
      }

      return !state.connected;
    },
    connecting() {
      state = { connecting: true, connected: false, disconnecting: false };
    },
    connected(connectedSocket: WebSocket) {
      socket = connectedSocket;
      state = { connected: true, connecting: false, disconnecting: false };
    },
    disconnected() {
      state = { connected: false, connecting: false, disconnecting: false };
      socket = null;
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
          'Illegal socket access while sending a message. Has Socky been prepared?',
        );
      }

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    },
    dispose() {
      // start dispose/close/disconnect only if its not alredy being performed
      if (!state.disconnecting) {
        state = { disconnecting: true, connected: false, connecting: false };

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Normal Closure');
        }

        socket = null;
        state = { disconnecting: false, connected: false, connecting: false };
      }
    },
  };
}

/** Creates a disposable GQL subscriptions client. */
export function createClient(options: ClientOptions): Client {
  const { url, connectionParams } = options;

  // holds all currently subscribed sinks, will use this map
  // to dispatch messages to the correct destination
  const subscribedSinks: Record<UUID, Sink> = {};

  function errorAllSinks(err: Error | CloseEvent) {
    Object.entries(subscribedSinks).forEach(([, sink]) => sink.error(err));
  }
  function completeAllSinks() {
    Object.entries(subscribedSinks).forEach(([, sink]) => sink.complete());
  }

  const socky = createSocky();
  async function prepare(): Promise<void> {
    if (await socky.shouldConnect()) {
      socky.connecting();

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
          socky.disconnected(); // just calling `onclose` means immediate disconnection

          if (closeEvent.code === 1000 || closeEvent.code === 1001) {
            // close event `1000: Normal Closure` is ok and so is `1001: Going Away` (maybe the server is restarting)
            completeAllSinks();
          } else {
            // all other close events are considered erroneous

            // reading the `CloseEvent.reason` can either throw or empty the whole error message
            // (if trying to pass the reason in the `Error` message). having this in mind,
            // simply let the user handle the close event...
            errorAllSinks(closeEvent);
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
            socket.close();
            socky.disconnected();

            errorAllSinks(err);
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
      if (subscribedSinks[uuid]) {
        sink.error(new Error(`Sink with ID ${uuid} already registered`));
        return noop;
      }
      subscribedSinks[uuid] = sink;

      let messageListener: Disposable | undefined,
        completed = false;
      prepare()
        .then(() => {
          // the sink might have completed before the socket became ready
          if (completed) {
            return;
          }

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
        completed = true;

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
        delete subscribedSinks[uuid];

        if (Object.entries(subscribedSinks).length === 0) {
          // dispose of socky :(
          socky.dispose();
        }
      };
    },
    dispose: async () => {
      // TODO-db-200817 complete or error? the sinks should be completed BEFORE the client gets disposed
      completeAllSinks();

      Object.keys(subscribedSinks).forEach((uuid) => {
        delete subscribedSinks[uuid];
      });

      // bye bye socky :(
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
