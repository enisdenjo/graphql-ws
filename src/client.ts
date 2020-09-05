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

export type EventConnecting = 'connecting';
export type EventConnect = 'connect';
export type EventDisconnected = 'disconnected';
export type EventMessage = 'message';
export type Event =
  | EventConnecting
  | EventConnect
  | EventDisconnected
  | EventMessage;

export type EventListener<E extends Event> = E extends EventConnecting
  ? () => void
  : E extends EventConnect
  ? (socket: WebSocket) => void
  : E extends EventDisconnected
  ? (event: CloseEvent) => void
  : E extends EventMessage
  ? (event: MessageEvent) => void
  : null;

type ConnectionParams =
  | Record<string, unknown>
  | (() => Record<string, unknown>);

/** Configuration used for the `create` client function. */
export interface ClientOptions {
  /** URL of the GraphQL server to connect. */
  url: string;
  /** Optional parameters that the client specifies when establishing a connection with the server. */
  connectionParams?: ConnectionParams;
}

export interface Client extends Disposable {
  /**
   * Subscribes through the WebSocket following the config parameters. It
   * uses the `sink` to emit received data or errors. Returns a _cleanup_
   * function used for dropping the subscription and cleaning stuff up.
   */
  subscribe<T = unknown>(payload: SubscribePayload, sink: Sink<T>): () => void;
}

/** The internal socket manager. */
function createSocket(options: ClientOptions) {
  const { url, connectionParams } = options;

  let state = {
    connecting: false,
    connectedSocket: null as WebSocket | null,
    disconnecting: false,
  };

  const subscribers = (() => {
    const state: { [event in Event]: EventListener<event>[] } = {
      connecting: [],
      connect: [],
      disconnected: [],
      message: [],
    };

    return {
      state,
      add<E extends Event>(event: E, listener: EventListener<E>) {
        (state[event] as EventListener<E>[]).push(listener);
      },
      remove<E extends Event>(event: E, listener: EventListener<E>) {
        const ev = state[event] as EventListener<E>[];
        ev.splice(ev.indexOf(listener), 1);
      },
      publish<E extends Event>(
        event: E,
        ...args: Parameters<EventListener<E>>
      ) {
        (state[event] as EventListener<E>[]).forEach((listener) => {
          // @ts-expect-error: The args do actually fit
          listener(...args);
        });
      },
    };
  })();

  async function up(): Promise<void> {
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
      return await up();
    }

    // the socket could've connected in the meantime
    if (state.connectedSocket) {
      return;
    }

    state = { ...state, connecting: true };
    subscribers.publish('connecting');
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
      state = {
        ...state,
        connectedSocket: null,
        disconnecting: false,
      };
      subscribers.publish('disconnected', closeEvent);
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

    let acknowledged = false;
    socket.onmessage = (event) => {
      try {
        if (!acknowledged) {
          const message = parseMessage(event.data);
          if (message.type !== MessageType.ConnectionAck) {
            throw new Error(`First message cannot be of type ${message.type}`);
          }
          acknowledged = true;
          state = {
            ...state,
            connectedSocket: socket,
            connecting: false,
          };
          subscribers.publish('connect', socket);
        } else {
          subscribers.publish('message', event);
        }
      } catch (err) {
        socket.close(4400, err);
      }
    };
  }

  function down() {
    if (!state.disconnecting) {
      state = { ...state, disconnecting: true };
      if (state.connectedSocket) {
        state.connectedSocket.close(1000, 'Normal Closure');
        state.connectedSocket = null;
        // the close event listener will update the state
      } else {
        state = {
          ...state,
          disconnecting: false,
        };
      }
    }
  }

  return {
    subscribe<E extends Event>(
      event: E,
      listener: EventListener<E>,
    ): Disposable {
      subscribers.add(event, listener);

      if (event === 'message') {
        up();
      }

      // notify fresh connect listeners immediately
      if (event === 'connect' && state.connectedSocket) {
        (listener as EventListener<EventConnect>)(state.connectedSocket);
      }

      return {
        dispose: () => {
          subscribers.remove(event, listener);

          // stop when last message unsubscribe
          if (event === 'message' && subscribers.state.message.length === 0) {
            down();
          }
        },
      };
    },
    send(data: string) {
      if (state.connectedSocket) {
        state.connectedSocket.send(data);
      }
    },
    disconnect() {
      down();
    },
  };
}

/** Creates a disposable GQL subscriptions client. */
export function createClient(options: ClientOptions): Client {
  const socket = createSocket(options);
  return {
    subscribe(payload, sink) {
      const uuid = generateUUID();

      const msgSub = socket.subscribe('message', ({ data }) => {
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

      let connected = false;
      const connSub = socket.subscribe('connect', () => {
        connected = true;
        socket.send(
          stringifyMessage<MessageType.Subscribe>({
            id: uuid,
            type: MessageType.Subscribe,
            payload,
          }),
        );
      });

      const disconnSub = socket.subscribe('disconnected', (event) => {
        if (!connected) {
          // might be that the disconnecting socket disconnected before this
          // one connected, in this case there is a new one coming for this sink
          return;
        }
        if (event.code === 1000 || event.code === 1001) {
          sink.complete();
        } else {
          sink.error(event);
        }
      });

      return () => {
        sink.complete();

        socket.send(
          stringifyMessage<MessageType.Complete>({
            id: uuid,
            type: MessageType.Complete,
          }),
        );

        disconnSub.dispose();
        connSub.dispose();
        msgSub.dispose();
      };
    },
    // the disconnect event will complete all subscribed sockets
    // TODO-db-200905 what happens if the sink didnt connect but it disconnected? (no taredown will be called)
    dispose: () => socket.disconnect(),
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
