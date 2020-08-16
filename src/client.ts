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
  SubscribeMessage,
  parseMessage,
  stringifyMessage,
} from './message';
import { noop } from './utils';

/** Configuration used for the `create` client function. */
export interface ClientOptions {
  // URL of the GraphQL server to connect.
  url: string;
  // Optional parameters that the client specifies when establishing a connection with the server.
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
}

export interface Client extends Disposable {
  /**
   * Subscribes through the WebSocket following the config parameters. It
   * uses the `sink` to emit received data or errors. Returns a _cleanup_
   * function used for dropping the subscription and cleaning stuff up.
   */
  subscribe<T = unknown>(
    payload: SubscribeMessage['payload'],
    sink: Sink<T>,
  ): () => void;
}

/** Creates a disposable GQL subscriptions client. */
export function createClient({ url, connectionParams }: ClientOptions): Client {
  // holds all currently subscribed sinks, will use this map
  // to dispatch messages to the correct destination
  const subscribedSinks: Record<UUID, Sink> = {};

  function errorAllSinks(err: Error) {
    Object.entries(subscribedSinks).forEach(([, sink]) => sink.error(err));
  }

  // Lazily creates a socket and establishes a connection described in the protocol.
  let activeSocket: WebSocket | null = null,
    connected = false,
    connecting = false;
  async function getConnectedSocket() {
    // wait for connected if connecting
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
      if (!activeSocket) {
        throw new Error('Connected on nothing');
      }
      return activeSocket;
    }

    connected = false;
    connecting = true;
    return new Promise<WebSocket>((resolve, reject) => {
      let done = false; // used to avoid resolving/rejecting the promise multiple times
      activeSocket = new WebSocket(url, GRAPHQL_TRANSPORT_WS_PROTOCOL);
      activeSocket.onclose = ({ code, reason }) => {
        const err = new Error(
          `Socket closed with event ${code}` + !reason ? '' : `: ${reason}`,
        );
        errorAllSinks(err);
        if (!done) {
          done = true;
          connecting = false;
          activeSocket = null;
          reject(err);
        }
      };
      activeSocket.onopen = () => {
        try {
          if (!activeSocket) {
            throw new Error('Opened a socket on nothing');
          }
          activeSocket.send(
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
            if (activeSocket) {
              activeSocket.close();
              activeSocket = null;
            }
            reject(err);
          }
        }
      };

      // the idea is to redefine the `onmessage` handler once this promise resolves
      activeSocket.onmessage = ({ data }) => {
        try {
          if (!activeSocket) {
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
            resolve(activeSocket);
          }
        } catch (err) {
          errorAllSinks(err);
          if (!done) {
            done = true;
            connecting = false;
            if (activeSocket) {
              activeSocket.close();
              activeSocket = null;
            }
            reject(err);
          }
        }
      };
    });
  }

  return {
    subscribe: (_payload, sink) => {
      const uuid = generateUUID();
      if (subscribedSinks[uuid]) {
        sink.error(new Error(`Sink already registered for UUID: ${uuid}`));
        return noop;
      }
      subscribedSinks[uuid] = sink;

      // TODO-db-200816 implement subscribing

      return () => {
        // TODO-db-200816 implement completing
      };
    },
    dispose: async () => {
      // complete all sinks
      Object.entries(subscribedSinks).forEach(([, sink]) => sink.complete());

      // delete all sinks
      Object.keys(subscribedSinks).forEach((uuid) => {
        delete subscribedSinks[uuid];
      });

      // if there is an active socket, close it with a normal closure
      if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
        activeSocket.close(1000, 'Normal Closure');
        activeSocket = null;
      }
    },
  };
}

/** Generates a new v4 UUID. Reference: https://stackoverflow.com/a/2117523/709884 */
export function generateUUID(): UUID {
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
