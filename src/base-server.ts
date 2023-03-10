/**
 *
 * server
 *
 */
import {
  CloseCode,
  ID,
  Message,
  MessageType,
  stringifyMessage,
  parseMessage,
  ConnectionInitMessage,
  SubscribeMessage,
  NextMessage,
  ErrorMessage,
  CompleteMessage,
  JSONMessageReplacer,
  JSONMessageReviver,
  PingMessage,
  PongMessage,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
} from './common';
import { isAsyncGenerator, isObject } from './utils';

/** @category Server */
export type SubscribeResult = {
  /**
   * Promise which resolves when subscription is completed.
   * Can be resolved with an ErrorMessage
   */
  waitToResolve: Promise<ErrorMessage | void>;
  cancel: () => void;
};

/** @category Server */
export interface ServerOptions<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E = unknown,
> {
  /**
   * Get the subscribe function.
   */
  subscribe: (props: {
    ctx: Context<P, E>;
    message: SubscribeMessage;
    emit: (message: NextMessage) => void;
  }) => SubscribeResult;
  /**
   * The amount of time for which the server will wait
   * for `ConnectionInit` message.
   *
   * Set the value to `Infinity`, `''`, `0`, `null` or `undefined` to skip waiting.
   *
   * If the wait timeout has passed and the client
   * has not sent the `ConnectionInit` message,
   * the server will terminate the socket by
   * dispatching a close event `4408: Connection initialisation timeout`
   *
   * @default 3_000 // 3 seconds
   */
  connectionInitWaitTimeout?: number;
  /**
   * Is the connection callback called when the
   * client requests the connection initialisation
   * through the message `ConnectionInit`.
   *
   * The message payload (`connectionParams` from the
   * client) is present in the `Context.connectionParams`.
   *
   * - Returning `true` or nothing from the callback will
   * allow the client to connect.
   *
   * - Returning `false` from the callback will
   * terminate the socket by dispatching the
   * close event `4403: Forbidden`.
   *
   * - Returning a `Record` from the callback will
   * allow the client to connect and pass the returned
   * value to the client through the optional `payload`
   * field in the `ConnectionAck` message.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onConnect?: (
    ctx: Context<P, E>,
  ) =>
    | Promise<Record<string, unknown> | boolean | void>
    | Record<string, unknown>
    | boolean
    | void;
  /**
   * Called when the client disconnects for whatever reason after
   * he successfully went through the connection initialisation phase.
   * Provides the close event too. Beware that this callback happens
   * AFTER all subscriptions have been gracefully completed and BEFORE
   * the `onClose` callback.
   *
   * If you are interested in tracking the subscriptions completions,
   * consider using the `onComplete` callback.
   *
   * This callback will be called EXCLUSIVELY if the client connection
   * is acknowledged. Meaning, `onConnect` will be called before the `onDisconnect`.
   *
   * For tracking socket closures at any point in time, regardless
   * of the connection state - consider using the `onClose` callback.
   */
  onDisconnect?: (
    ctx: Context<P, E>,
    code: number,
    reason: string,
  ) => Promise<void> | void;
  /**
   * Called when the socket closes for whatever reason, at any
   * point in time. Provides the close event too. Beware
   * that this callback happens AFTER all subscriptions have
   * been gracefully completed and AFTER the `onDisconnect` callback.
   *
   * If you are interested in tracking the subscriptions completions,
   * consider using the `onComplete` callback.
   *
   * In comparison to `onDisconnect`, this callback will ALWAYS
   * be called, regardless if the user succesfully went through
   * the connection initialisation or not. `onConnect` might not
   * called before the `onClose`.
   */
  onClose?: (
    ctx: Context<P, E>,
    code: number,
    reason: string,
  ) => Promise<void> | void;
  /**
   * The subscribe callback executed right after
   * acknowledging the request before any payload
   * processing has been performed.
   *
   * To report error simply return ErrorMessage
   * from the callback, it be reported
   * to the client through the error message.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onSubscribe?: (
    ctx: Context<P, E>,
    message: SubscribeMessage,
  ) => Promise<ErrorMessage | void> | ErrorMessage | void;
  /**
   * Executed after an error occured right before it
   * has been dispatched to the client.
   *
   * Use this callback to format the outgoing errors before they reach the client.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onError?: (
    ctx: Context<P, E>,
    message: ErrorMessage,
  ) => Promise<void | ErrorMessage> | void | ErrorMessage;
  /**
   * Executed after an operation has emitted a result right before
   * that result has been sent to the client. Results from both
   * single value and streaming operations will appear in this callback.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   */
  onNext?: (
    ctx: Context<P, E>,
    payload: NextMessage,
  ) => Promise<void | NextMessage> | void | NextMessage;
  /**
   * The complete callback is executed after the
   * operation has completed right before sending
   * the complete message to the client.
   *
   * Throwing an error from within this function will
   * close the socket with the `Error` message
   * in the close event reason.
   *
   * Since the library makes sure to complete streaming
   * operations even after an abrupt closure, this callback
   * will still be called.
   */
  onComplete?: (
    ctx: Context<P, E>,
    message: CompleteMessage,
  ) => Promise<void> | void;
  /**
   * An optional override for the JSON.parse function used to hydrate
   * incoming messages to this server. Useful for parsing custom datatypes
   * out of the incoming JSON.
   */
  jsonMessageReviver?: JSONMessageReviver;
  /**
   * An optional override for the JSON.stringify function used to serialize
   * outgoing messages to from server. Useful for serializing custom
   * datatypes out to the client.
   */
  jsonMessageReplacer?: JSONMessageReplacer;
}

/** @category Server */
export interface Server<E = unknown> {
  /**
   * New socket has beeen established. The lib will validate
   * the protocol and use the socket accordingly. Returned promise
   * will resolve after the socket closes.
   *
   * The second argument will be passed in the `extra` field
   * of the `Context`. You may pass the initial request or the
   * original WebSocket, if you need it down the road.
   *
   * Returns a function that should be called when the same socket
   * has been closed, for whatever reason. The close code and reason
   * must be passed for reporting to the `onDisconnect` callback. Returned
   * promise will resolve once the internal cleanup is complete.
   */
  opened(
    socket: WebSocket,
    extra: E,
  ): (code: number, reason: string) => Promise<void>; // closed
}

/** @category Server */
export interface WebSocket {
  /**
   * The subprotocol of the WebSocket. Will be used
   * to validate agains the supported ones.
   */
  readonly protocol: string;
  /**
   * Sends a message through the socket. Will always
   * provide a `string` message.
   *
   * Please take care that the send is ready. Meaning,
   * only provide a truly OPEN socket through the `opened`
   * method of the `Server`.
   *
   * The returned promise is used to control the flow of data
   * (like handling backpressure).
   */
  send(data: string): Promise<void> | void;
  /**
   * Closes the socket gracefully. Will always provide
   * the appropriate code and close reason. `onDisconnect`
   * callback will be called.
   *
   * The returned promise is used to control the graceful
   * closure.
   */
  close(code: number, reason: string): Promise<void> | void;
  /**
   * Called when message is received. The library requires the data
   * to be a `string`.
   *
   * All operations requested from the client will block the promise until
   * completed, this means that the callback will not resolve until all
   * subscription events have been emitted (or until the client has completed
   * the stream), or until the query/mutation resolves.
   *
   * Exceptions raised during any phase of operation processing will
   * reject the callback's promise, catch them and communicate them
   * to your clients however you wish.
   */
  onMessage(cb: (data: string) => Promise<void>): void;
  /**
   * Implement a listener for the `PingMessage` sent from the client to the server.
   * If the client sent the ping with a payload, it will be passed through the
   * first argument.
   *
   * If this listener is implemented, the server will NOT automatically reply
   * to any pings from the client. Implementing it makes it your resposibility
   * to decide how and when to respond.
   */
  onPing?(payload: PingMessage['payload']): Promise<void> | void;
  /**
   * Implement a listener for the `PongMessage` sent from the client to the server.
   * If the client sent the pong with a payload, it will be passed through the
   * first argument.
   */
  onPong?(payload: PongMessage['payload']): Promise<void> | void;
}

/** @category Server */
export interface Context<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E = unknown,
> {
  /**
   * Indicates that the `ConnectionInit` message
   * has been received by the server. If this is
   * `true`, the client wont be kicked off after
   * the wait timeout has passed.
   */
  readonly connectionInitReceived: boolean;
  /**
   * Indicates that the connection was acknowledged
   * by having dispatched the `ConnectionAck` message
   * to the related client.
   */
  readonly acknowledged: boolean;
  /** The parameters passed during the connection initialisation. */
  readonly connectionParams?: Readonly<P>;
  /**
   * Holds the active subscriptions for this context. **All operations**
   * that are taking place are aggregated here. The user is _subscribed_
   * to an operation when waiting for result(s).
   *
   * If the subscription behind an ID is an `AsyncIterator` - the operation
   * is streaming; on the contrary, if the subscription is `null` - it is simply
   * a reservation, meaning - the operation resolves to a single result or is still
   * pending/being prepared.
   */
  readonly subscriptions: Record<ID, SubscribeResult | null>;
  /**
   * An extra field where you can store your own context values
   * to pass between callbacks.
   */
  extra: E;
}

class SubscriptionConnection<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E = unknown,
> {
  private readonly subscriptions = new Map<ID, SubscribeResult | null>();
  private ctx: Context<P, E>;
  private connectionInitWait: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(
    private readonly serverOptions: ServerOptions<P, E>,
    private readonly socket: WebSocket,
    extra: E,
  ) {
    const subs = this.subscriptions;
    this.ctx = {
      acknowledged: false,
      connectionInitReceived: false,
      extra,
      get subscriptions() {
        return Object.fromEntries(subs);
      },
    };

    const { connectionInitWaitTimeout = 3000 } = this.serverOptions;

    // kick the client off (close socket) if the connection has
    // not been initialised after the specified wait timeout
    this.connectionInitWait =
      connectionInitWaitTimeout > 0 && isFinite(connectionInitWaitTimeout)
        ? setTimeout(() => {
            if (!this.ctx.connectionInitReceived)
              this._handleClose(
                CloseCode.ConnectionInitialisationTimeout,
                'Connection initialisation timeout',
              );
          }, connectionInitWaitTimeout)
        : null;

    this.socket.onMessage(this._onMessage.bind(this));
  }

  public async close(code: number, reason: string) {
    this.closed = true;
    if (this.connectionInitWait) clearTimeout(this.connectionInitWait);
    for (const sub of this.subscriptions.values()) {
      if (sub) {
        sub.cancel();
      }
    }

    this.subscriptions.clear();

    if (this.ctx.acknowledged)
      await this.serverOptions.onDisconnect?.(this.ctx, code, reason);

    await this.serverOptions.onClose?.(this.ctx, code, reason);
  }

  private async _onMessage(data: string) {
    if (this.closed) {
      throw new Error('connection is closed');
    }

    let message: Message;

    try {
      message = parseMessage(data, this.serverOptions.jsonMessageReviver);
    } catch (err) {
      return this._handleClose(
        CloseCode.BadRequest,
        'Invalid message received',
      );
    }

    switch (message.type) {
      case MessageType.ConnectionInit:
        await this._handleConnectionInit(message);
        break;
      case MessageType.Ping:
        {
          if (this.socket.onPing) {
            // if the onPing listener is registered, automatic pong is disabled
            return await this.socket.onPing(message.payload);
          }

          await this.socket.send(
            stringifyMessage(
              message.payload
                ? { type: MessageType.Pong, payload: message.payload }
                : {
                    type: MessageType.Pong,
                    // payload is completely absent if not provided
                  },
            ),
          );
          //       return;
        }
        break;
      case MessageType.Pong:
        {
          await this.socket.onPong?.(message.payload);
        }
        break;
      case MessageType.Subscribe:
        {
          const msg = message;
          await this._handleSubscribe(msg).finally(() => {
            // clean up
            this._handleComplete(msg.id);
          });
        }
        break;
      case MessageType.Complete:
        this._handleComplete(message.id);
        break;
      default:
        throw new Error(`Unexpected message of type ${message.type} received`);
    }
  }

  private _handleClose(code: number, reason: string) {
    Array.from(this.subscriptions.values()).forEach(
      (sc) => isAsyncGenerator(sc) && sc.return(undefined),
    );

    if (this.connectionInitWait) {
      clearInterval(this.connectionInitWait);
    }

    return this.socket.close(code, reason);
  }

  private async _handleConnectionInit(msg: ConnectionInitMessage) {
    if (this.ctx.connectionInitReceived) {
      return this._handleClose(
        CloseCode.TooManyInitialisationRequests,
        'Too many initialisation requests',
      );
    }

    // @ts-expect-error: I can write
    this.ctx.connectionInitReceived = true;

    if (isObject(msg.payload)) {
      // @ts-expect-error: I can write
      this.ctx.connectionParams = msg.payload;
    }

    const permittedOrPayload = await this.serverOptions.onConnect?.(this.ctx);

    if (permittedOrPayload === false) {
      return this._handleClose(CloseCode.Forbidden, 'Forbidden');
    }

    await this.socket.send(
      stringifyMessage<MessageType.ConnectionAck>(
        isObject(permittedOrPayload)
          ? {
              type: MessageType.ConnectionAck,
              payload: permittedOrPayload,
            }
          : {
              type: MessageType.ConnectionAck,
              // payload is completely absent if not provided
            },
        this.serverOptions.jsonMessageReplacer,
      ),
    );

    // @ts-expect-error: I can write
    this.ctx.acknowledged = true;
  }

  private async _send(
    sub_id: string,
    message: NextMessage | ErrorMessage | CompleteMessage,
  ) {
    let msg: NextMessage | ErrorMessage | CompleteMessage = message;
    if (message.type === MessageType.Error) {
      msg = (await this.serverOptions.onError?.(this.ctx, message)) ?? msg;
    }

    if (message.type === MessageType.Complete) {
      msg = (await this.serverOptions.onComplete?.(this.ctx, message)) ?? msg;
    }

    if (message.type === MessageType.Next) {
      msg = (await this.serverOptions.onNext?.(this.ctx, message)) ?? msg;
    }

    if (this.subscriptions.has(sub_id)) {
      await this.socket.send(
        stringifyMessage(message, this.serverOptions.jsonMessageReplacer),
      );
    }
  }

  private async _handleSubscribe(msg: SubscribeMessage) {
    if (!this.ctx.acknowledged) {
      return this._handleClose(CloseCode.Unauthorized, 'Unauthorized');
    }

    const { id } = msg;

    if (this.subscriptions.has(id)) {
      return this._handleClose(
        CloseCode.SubscriberAlreadyExists,
        `Subscriber for ${id} already exists`,
      );
    }

    this.subscriptions.set(id, null);

    const resOrError = await this.serverOptions.onSubscribe?.(this.ctx, msg);

    if (resOrError) {
      return this._send(id, resOrError);
    }

    // is closed from other source
    if (!this.subscriptions.has(id)) {
      return;
    }

    const sub = this.serverOptions.subscribe({
      message: msg,
      ctx: this.ctx,
      emit: (message) => this._send(id, message),
    });

    this.subscriptions.set(id, sub);

    const error = await sub.waitToResolve;
    // resolved with error, just report and return
    if (error) {
      this._send(id, error);
      return;
    }

    await this._send(id, { type: MessageType.Complete, id: id });

    this._handleComplete(id);
  }

  private _handleComplete(id: string) {
    const sub = this.subscriptions.get(id);
    if (sub) {
      sub.cancel();
    }
    this.subscriptions.delete(id);
  }
}

/**
 * Makes a graphql-ws Protocol complient WebSocket server. The server
 * is actually an API which is to be used with your favourite WebSocket
 * server library!
 *
 * Read more about the Protocol in the PROTOCOL.md documentation file.
 *
 * @category Server
 */
export function makeBaseServer<
  P extends ConnectionInitMessage['payload'] = ConnectionInitMessage['payload'],
  E = unknown,
>(options: ServerOptions<P, E>): Server<E> {
  return {
    opened(socket, extra) {
      if (socket.protocol !== GRAPHQL_TRANSPORT_WS_PROTOCOL) {
        socket.close(
          CloseCode.SubprotocolNotAcceptable,
          'Subprotocol not acceptable',
        );
        return async (code, reason) => {
          /* nothing was set up, just notify the closure */
          await options.onClose?.(
            {
              acknowledged: false,
              connectionInitReceived: false,
              extra: extra,
              subscriptions: {},
            },
            code,
            reason,
          );
        };
      }

      const sc = new SubscriptionConnection(options, socket, extra);
      return (code, reason) => sc.close(code, reason);
    },
  };
}
