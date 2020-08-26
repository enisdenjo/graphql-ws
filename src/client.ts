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

/** Creates a disposable GQL subscriptions client. */
export function createClient(options: ClientOptions): Client {
  const { url, connectionParams } = options;

  // holds all currently subscribed sinks, will use this map
  // to dispatch messages to the correct destination
  const subscribedSinks: Record<UUID, Sink> = {};

  function errorAllSinks(err: Error) {
    Object.entries(subscribedSinks).forEach(([, sink]) => sink.error(err));
  }
  function completeAllSinks() {
    Object.entries(subscribedSinks).forEach(([, sink]) => sink.complete());
  }

  // Lazily uses the socket singleton to establishes a connection described by the protocol.
  let socket: WebSocket | null = null,
    connected = false,
    connecting = false;
  async function connect(): Promise<void> {
    if (connected) {
      return;
    }

    if (connecting) {
      let waitedTimes = 0;
      while (!connected) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        // 100ms * 50 = 5sec
        if (waitedTimes >= 50) {
          throw new Error('Waited 10 seconds but socket never connected');
        }
        waitedTimes++;
      }

      // connected === true
      return;
    }

    connected = false;
    connecting = true;
    return new Promise((resolve, reject) => {
      let done = false; // used to avoid resolving/rejecting the promise multiple times
      socket = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);

      /**
       * `onerror` handler is unnecessary because even if an error occurs, the `onclose` handler will be called
       *
       * From: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
       * > If an error occurs while attempting to connect, first a simple event with the name error is sent to the
       * > WebSocket object (thereby invoking its onerror handler), and then the CloseEvent is sent to the WebSocket
       * > object (thereby invoking its onclose handler) to indicate the reason for the connection's closing.
       */

      socket.onclose = ({ code, reason }) => {
        const err = new Error(
          `Socket closed with event ${code}` + !reason ? '' : `: ${reason}`,
        );

        if (code === 1000 || code === 1001) {
          // close event `1000: Normal Closure` is ok and so is `1001: Going Away` (maybe the server is restarting)
          completeAllSinks();
        } else {
          // all other close events are considered erroneous
          errorAllSinks(err);
        }

        if (!done) {
          done = true;
          connecting = false;
          connected = false; // the connection is lost
          socket = null;
          reject(err); // we reject here bacause the close is not supposed to be called during the connect phase
        }
      };
      socket.onopen = () => {
        try {
          if (!socket) {
            throw new Error('Opened a socket on nothing');
          }
          socket.send(
            stringifyMessage<MessageType.ConnectionInit>({
              type: MessageType.ConnectionInit,
              payload:
                typeof connectionParams === 'function'
                  ? connectionParams()
                  : connectionParams,
            }),
          );
        } catch (err) {
          errorAllSinks(err);
          if (!done) {
            done = true;
            connecting = false;
            if (socket) {
              socket.close();
              socket = null;
            }
            reject(err);
          }
        }
      };

      function handleMessage({ data }: MessageEvent) {
        try {
          if (!socket) {
            throw new Error('Received a message on nothing');
          }

          const message = parseMessage(data);
          if (message.type !== MessageType.ConnectionAck) {
            throw new Error(`First message cannot be of type ${message.type}`);
          }

          // message.type === MessageType.ConnectionAck
          if (!done) {
            done = true;
            connecting = false;
            connected = true; // only now is the connection ready
            resolve();
          }
        } catch (err) {
          errorAllSinks(err);
          if (!done) {
            done = true;
            connecting = false;
            if (socket) {
              socket.close();
              socket = null;
            }
            reject(err);
          }
        } finally {
          if (socket) {
            // this listener is not necessary anymore
            socket.removeEventListener('message', handleMessage);
          }
        }
      }
      socket.addEventListener('message', handleMessage);
    });
  }

  return {
    subscribe: (payload, sink) => {
      const uuid = generateUUID();
      if (subscribedSinks[uuid]) {
        sink.error(new Error(`Sink with ID ${uuid} already registered`));
        return noop;
      }
      subscribedSinks[uuid] = sink;

      function handleMessage({ data }: MessageEvent) {
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
      }

      (async () => {
        try {
          await connect();
          if (!socket) {
            throw new Error('Socket connected but empty');
          }

          socket.addEventListener('message', handleMessage);
          socket.send(
            stringifyMessage<MessageType.Subscribe>({
              id: uuid,
              type: MessageType.Subscribe,
              payload,
            }),
          );
        } catch (err) {
          sink.error(err);
        }
      })();

      return () => {
        if (socket) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              stringifyMessage<MessageType.Complete>({
                id: uuid,
                type: MessageType.Complete,
              }),
            );
          }

          socket.removeEventListener('message', handleMessage);

          // equal to 1 because this sink is the last one.
          // the deletion from the map happens afterwards
          if (Object.entries(subscribedSinks).length === 1) {
            if (socket.readyState === WebSocket.OPEN) {
              socket.close(1000, 'Normal Closure');
            }
            socket = null;
          }
        }

        sink.complete();
        delete subscribedSinks[uuid];
      };
    },
    dispose: async () => {
      // complete all sinks
      // TODO-db-200817 complete or error? the sinks should be completed BEFORE the client gets disposed
      completeAllSinks();

      // delete all sinks
      Object.keys(subscribedSinks).forEach((uuid) => {
        delete subscribedSinks[uuid];
      });

      // if there is an active socket, close it with a normal closure
      if (socket && socket.readyState === WebSocket.OPEN) {
        // TODO-db-200817 decide if `1001: Going Away` should be used instead
        socket.close(1000, 'Normal Closure');
        socket = null;
      }
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
