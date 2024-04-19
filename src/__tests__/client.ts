/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  createClient,
  Client,
  EventListener,
  TerminatedCloseEvent,
} from '../client';
import {
  CloseCode,
  MessageType,
  parseMessage,
  stringifyMessage,
  SubscribePayload,
} from '../common';
import { startRawServer, startWSTServer as startTServer } from './utils';
import { ExecutionResult } from 'graphql';
import { pong } from './fixtures/simple';

// silence console.error calls for nicer tests overview
const consoleError = console.error;
beforeAll(() => {
  console.error = () => {
    // silence
  };
});
afterAll(() => {
  console.error = consoleError;
});

// simulate browser environment for easier client testing
beforeEach(() => {
  Object.assign(global, {
    WebSocket: WebSocket,
  });
});

// Just does nothing
function noop(): void {
  /**/
}

interface TSubscribe<T> {
  waitForNext: (
    test?: (value: ExecutionResult<T, unknown>) => void,
    expire?: number,
  ) => Promise<void>;
  waitForError: (
    test?: (error: unknown) => void,
    expire?: number,
  ) => Promise<void>;
  waitForComplete: (test?: () => void, expire?: number) => Promise<void>;
  dispose: () => void;
}

function tsubscribe<T = unknown>(
  client: Client,
  payload: SubscribePayload,
): TSubscribe<T> {
  const emitter = new EventEmitter();
  const results: ExecutionResult<T, unknown>[] = [];
  let error: unknown,
    completed = false;
  const dispose = client.subscribe<T>(payload, {
    next: (value) => {
      results.push(value);
      emitter.emit('next');
    },
    error: (err) => {
      error = err;
      emitter.emit('err');
      emitter.removeAllListeners();
    },
    complete: () => {
      completed = true;
      emitter.emit('complete');
      emitter.removeAllListeners();
    },
  });

  return {
    waitForNext: (test, expire) => {
      return new Promise((resolve) => {
        function done() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const result = results.shift()!;
          test?.(result);
          resolve();
        }
        if (results.length > 0) return done();
        emitter.once('next', done);
        if (expire)
          setTimeout(() => {
            emitter.off('next', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForError: (test, expire) => {
      return new Promise((resolve) => {
        function done() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          test?.(error);
          resolve();
        }
        if (error) return done();
        emitter.once('err', done);
        if (expire)
          setTimeout(() => {
            emitter.off('err', done); // expired
            resolve();
          }, expire);
      });
    },
    waitForComplete: (test, expire) => {
      return new Promise((resolve) => {
        function done() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          test?.();
          resolve();
        }
        if (completed) return done();
        emitter.once('complete', done);
        if (expire)
          setTimeout(() => {
            emitter.off('complete', done); // expired
            resolve();
          }, expire);
      });
    },
    dispose,
  };
}

/**
 * Tests
 */

it('should use the provided WebSocket implementation', async (done) => {
  const { url } = await startTServer();

  Object.assign(global, {
    WebSocket: null,
  });

  createClient({
    url,
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
    webSocketImpl: WebSocket,
    on: {
      connected: () => done(),
    },
  });
});

it('should accept a function for the url', async () => {
  const { url, ...server } = await startTServer();

  createClient({
    url: () => Promise.resolve(url),
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
  });

  await server.waitForClient();
});

it('should not accept invalid WebSocket implementations', async () => {
  const { url } = await startTServer();

  Object.assign(global, {
    WebSocket: null,
  });

  expect(() =>
    createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
      lazy: false,
      webSocketImpl: {},
    }),
  ).toThrow();
});

it('should recieve optional connection ack payload in event handler', async (done) => {
  const { url } = await startTServer({
    onConnect: () => ({ itsa: 'me' }),
  });

  createClient({
    url,
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
    on: {
      connected: (_socket, payload) => {
        try {
          expect(payload).toEqual({ itsa: 'me' });
        } catch (err) {
          fail(err);
        }
        done();
      },
    },
  });
});

it('should close with error message during connecting issues', async (done) => {
  expect.assertions(4);

  const { url } = await startTServer();

  const someErr = new Error('Welcome');
  const client = createClient({
    url,
    retryAttempts: 0,
    onNonLazyError: noop,
    on: {
      closed: (event) => {
        expect((event as CloseEvent).code).toBe(CloseCode.BadResponse);
        expect((event as CloseEvent).reason).toBe('Welcome');
        expect((event as CloseEvent).wasClean).toBeTruthy();

        done();
      },
      connected: () => {
        // the `connected` listener is called right before successful connection
        throw someErr;
      },
    },
  });

  const sub = tsubscribe(client, {
    query: 'query { getValue }',
  });

  await sub.waitForError((err) => {
    expect(err).toBe(someErr);
  });
});

it('should pass the `connectionParams` through', async () => {
  const server = await startTServer();

  let client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
    connectionParams: { auth: 'token' },
  });
  await server.waitForConnect((ctx) => {
    expect(ctx.connectionParams).toEqual({ auth: 'token' });
  });
  await client.dispose();

  client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
    connectionParams: () => ({ from: 'func' }),
  });
  await server.waitForConnect((ctx) => {
    expect(ctx.connectionParams).toEqual({ from: 'func' });
  });
  await client.dispose();

  client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
    connectionParams: () => Promise.resolve({ from: 'promise' }),
  });
  await server.waitForConnect((ctx) => {
    expect(ctx.connectionParams).toEqual({ from: 'promise' });
  });
});

it('should close the socket if the `connectionParams` rejects or throws', async (done) => {
  expect.assertions(8);

  const server = await startTServer();

  const someErr = new Error('No auth?');

  let client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    on: {
      closed: (event) => {
        expect((event as CloseEvent).code).toBe(CloseCode.InternalClientError);
        expect((event as CloseEvent).reason).toBe('No auth?');
        expect((event as CloseEvent).wasClean).toBeTruthy();
      },
    },
    connectionParams: () => {
      throw someErr;
    },
  });

  let sub = tsubscribe(client, { query: '{ getValue }' });
  await sub.waitForError((err) => {
    expect(err).toBe(someErr);
  });

  client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    on: {
      closed: (event) => {
        expect((event as CloseEvent).code).toBe(CloseCode.InternalClientError);
        expect((event as CloseEvent).reason).toBe('No auth?');
        expect((event as CloseEvent).wasClean).toBeTruthy();

        done();
      },
    },
    connectionParams: () => Promise.reject(someErr),
  });

  sub = tsubscribe(client, { query: '{ getValue }' });
  await sub.waitForError((err) => {
    expect(err).toBe(someErr);
  });
});

it('should report close events when `connectionParams` takes too long', async (done) => {
  const server = await startTServer({
    connectionInitWaitTimeout: 10,
  });

  // lazy
  const client = createClient({
    url: server.url,
    retryAttempts: 0,
    connectionParams: () =>
      // takes longer than the connectionInitWaitTimeout
      new Promise<undefined>((resolve) => setTimeout(resolve, 20)),
  });

  const sub = tsubscribe(client, { query: '{ getValue }' });

  await sub.waitForError((event) => {
    expect((event as CloseEvent).code).toBe(
      CloseCode.ConnectionInitialisationTimeout,
    );
  });

  // non-lazy
  createClient({
    url: server.url,
    retryAttempts: 0,
    lazy: false,
    onNonLazyError: (event) => {
      expect((event as CloseEvent).code).toBe(
        CloseCode.ConnectionInitialisationTimeout,
      );
      done();
    },
    connectionParams: () =>
      // takes longer than the connectionInitWaitTimeout
      new Promise<undefined>((resolve) => setTimeout(resolve, 20)),
  });
});

it('should not send the complete message if the socket is not open', async () => {
  const { url, waitForOperation } = await startTServer();

  let close = () => {
    // see below
  };
  class MockWebSocket extends WebSocket {
    constructor(...args: unknown[]) {
      // @ts-expect-error Args will fit
      super(...args);
      close = () => this.close();
    }

    public send(data: string) {
      if (this.readyState !== WebSocket.OPEN)
        fail("Shouldn't send anything through a non-OPEN socket");
      super.send(data);
    }
  }

  const client = createClient({
    webSocketImpl: MockWebSocket,
    url,
    retryAttempts: 0,
    onNonLazyError: noop,
  });
  const sub = tsubscribe(client, { query: 'subscription { ping }' });
  await waitForOperation();

  // client leaves
  close();

  // dispose of the subscription which should complete the connection
  sub.dispose();
  await sub.waitForComplete();
});

it('should not call complete after subscription error', async () => {
  const { url } = await startTServer();

  const client = createClient({
    url,
    lazy: true,
    retryAttempts: 0,
  });

  // invalid subscription
  const sub = tsubscribe(client, {
    query: '{ iDontExist }',
  });

  // report error
  await sub.waitForError();

  // but not complete
  await sub.waitForComplete(() => {
    fail("shouldn't have completed");
  }, 20);
});

it('should not call complete after connection error', async () => {
  const { url, waitForClient } = await startTServer();

  const client = createClient({
    url,
    lazy: false,
    retryAttempts: 0,
  });

  const sub = tsubscribe(client, {
    query: '{ getValue }',
  });

  // kick off immediately
  await waitForClient((client) => {
    client.close();
  });

  // report error
  await sub.waitForError();

  // but not complete
  await sub.waitForComplete(() => {
    fail("shouldn't have completed");
  }, 20);
});

it('should use a custom JSON message reviver function', async () => {
  const { url } = await startTServer();

  const client = createClient({
    url,
    lazy: false,
    retryAttempts: 0,
    onNonLazyError: noop,
    jsonMessageReviver: (key, value) => {
      if (key === 'getValue') {
        return 'VALUE';
      }
      return value;
    },
  });

  await tsubscribe(client, {
    query: '{ getValue }',
  }).waitForNext((data) => {
    expect(data).toEqual({ data: { getValue: 'VALUE' } });
  });
});

it('should use a custom JSON message replacer function', async (done) => {
  const { url, waitForClient } = await startTServer();

  createClient({
    url,
    lazy: false,
    retryAttempts: 0,
    onNonLazyError: noop,
    jsonMessageReplacer: (key, value) => {
      if (key === 'type') {
        return 'CONNECTION_INIT';
      }
      return value;
    },
  });

  await waitForClient((client) => {
    client.onMessage((data) => {
      expect(data).toBe('{"type":"CONNECTION_INIT"}');
      done();
    });
  });
});

it('should close socket if connection not acknowledged', async (done) => {
  const { url, ...server } = await startTServer({
    onConnect: () =>
      new Promise(() => {
        // never acknowledge
      }),
  });

  const client = createClient({
    url,
    lazy: false,
    retryAttempts: 0,
    onNonLazyError: noop,
    connectionAckWaitTimeout: 10,
  });

  client.on('closed', async (err) => {
    expect((err as CloseEvent).code).toBe(
      CloseCode.ConnectionAcknowledgementTimeout,
    );
    await server.dispose();
    done();
  });
});

it('should close socket with error on malformed request', async (done) => {
  expect.assertions(4);

  const { url } = await startTServer();

  const client = createClient({
    url,
    lazy: false,
    retryAttempts: 0,
    onNonLazyError: noop,
    on: {
      closed: (err) => {
        expect((err as CloseEvent).code).toBe(CloseCode.InternalServerError);
        expect((err as CloseEvent).reason).toBe(
          'Syntax Error: Unexpected Name "notaquery".',
        );
      },
    },
  });

  client.subscribe(
    {
      query: 'notaquery',
    },
    {
      next: noop,
      error: (err) => {
        expect((err as CloseEvent).code).toBe(CloseCode.InternalServerError);
        expect((err as CloseEvent).reason).toBe(
          'Syntax Error: Unexpected Name "notaquery".',
        );
        client.dispose();
        done();
      },
      complete: noop,
    },
  );
});

it('should report close error even if complete message followed', async (done) => {
  expect.assertions(3);

  const { url, server } = await startRawServer();

  server.on('connection', (socket) => {
    socket.on('message', (data) => {
      const msg = parseMessage(String(data));

      // acknowledge conneciton
      if (msg.type === MessageType.ConnectionInit)
        socket.send(stringifyMessage({ type: MessageType.ConnectionAck }));

      // respond with a malformed error message and a complete
      if (msg.type === MessageType.Subscribe) {
        socket.send(
          JSON.stringify({
            id: msg.id,
            type: MessageType.Error,
            payload: 'malformed',
          }),
        );
        socket.send(
          stringifyMessage({ id: msg.id, type: MessageType.Complete }),
        );
      }
    });
  });

  const client = createClient({
    url,
    lazy: false,
    retryAttempts: 0,
    onNonLazyError: noop,
    on: {
      closed: (err) => {
        expect((err as CloseEvent).code).toBe(CloseCode.BadResponse);
        expect((err as CloseEvent).reason).toMatchSnapshot();

        done();
      },
    },
  });

  client.subscribe(
    {
      query: 'notaquery',
    },
    {
      next: noop,
      error: (err) => {
        expect((err as Error).message).toMatchSnapshot();
        client.dispose();
      },
      complete: noop,
    },
  );
});

it('should report close causing internal client errors to listeners', async () => {
  expect.assertions(4);

  const { url } = await startTServer();

  const someError = new Error('Something went wrong!');

  // internal client error
  await new Promise<void>((resolve) =>
    createClient({
      url,
      // retryAttempts: 0, should fail immediately because error is thrown
      lazy: false,
      onNonLazyError: (err) => {
        expect(err).toBe(someError);
        resolve();
      },
      on: {
        error: (err) => {
          expect(err).toBe(someError);
        },
      },
      connectionParams: () => {
        throw someError;
      },
    }),
  );

  // simulate bad response
  await new Promise<void>((resolve) =>
    createClient({
      url,
      // retryAttempts: 0, should fail immediately because error is thrown
      lazy: false,
      onNonLazyError: (err) => {
        expect(err).toBe(someError);
        resolve();
      },
      on: {
        error: (err) => {
          expect(err).toBe(someError);
        },
        message: () => {
          throw someError;
        },
      },
    }),
  );
});

it('should report close causing internal client errors to subscription sinks', async () => {
  const { url } = await startTServer();

  const someError = new Error('Something went wrong!');

  // internal client error
  await new Promise<void>((resolve) => {
    const client = createClient({
      url,
      // retryAttempts: 0, should fail immediately because error is thrown
      connectionParams: () => {
        throw someError;
      },
    });

    client.subscribe(
      { query: '{ getValue }' },
      {
        next: noop,
        complete: noop,
        error: (err) => {
          expect(err).toBe(someError);
          resolve();
        },
      },
    );
  });

  // simulate bad response
  await new Promise<void>((resolve) => {
    let i = 0;
    const client = createClient({
      url,
      // retryAttempts: 0, should fail immediately because error is thrown
      on: {
        message: () => {
          i++;
          if (i === 2) {
            // throw on second message to simulate bad responses while connected
            throw someError;
          }
        },
      },
    });

    client.subscribe(
      { query: '{ getValue }' },
      {
        next: noop,
        complete: noop,
        error: (err) => {
          expect(err).toBe(someError);
          resolve();
        },
      },
    );
  });
});

it('should limit the internal client error message size', async (done) => {
  const { url } = await startTServer();

  const longError = new Error(
    'i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characte',
  );

  createClient({
    url,
    retryAttempts: 0,
    lazy: false,
    onNonLazyError: noop,
    on: {
      closed: (event) => {
        expect((event as CloseEvent).code).toBe(CloseCode.InternalClientError);
        expect((event as CloseEvent).reason).toBe('Internal client error');
        expect((event as CloseEvent).wasClean).toBeTruthy(); // because the client reported the error

        done();
      },
    },
    connectionParams: () => {
      throw longError;
    },
  });
});

it('should limit the internal client bad response error message size', async (done) => {
  const { url } = await startTServer();

  const longError = new Error(
    'i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characters long i am exactly 124 characte',
  );

  createClient({
    url,
    retryAttempts: 0,
    lazy: false,
    onNonLazyError: noop,
    on: {
      message: () => {
        // message listener is called inside the WebSocket.onmessage,
        // perfect place to throw a long error
        throw longError;
      },
      closed: (event) => {
        expect((event as CloseEvent).code).toBe(CloseCode.BadResponse);
        expect((event as CloseEvent).reason).toBe('Bad response');
        expect((event as CloseEvent).wasClean).toBeTruthy(); // because the client reported the error

        done();
      },
    },
  });
});

it('should terminate socket immediately on terminate', async (done) => {
  const { url, waitForConnect } = await startTServer();

  class CannotCloseWebSocket extends WebSocket {
    constructor(...args: unknown[]) {
      // @ts-expect-error Args will fit
      super(...args);
    }

    public close() {
      // unresponsive
    }
  }

  const client = createClient({
    url,
    retryAttempts: 0,
    lazy: false,
    onNonLazyError: noop,
    webSocketImpl: CannotCloseWebSocket,
    on: {
      closed: (event) => {
        expect(event).not.toBeInstanceOf(CloseEvent); // because its an artificial close-event-like object
        expect(event).toBeInstanceOf(TerminatedCloseEvent);
        expect((event as TerminatedCloseEvent).name).toBe(
          'TerminatedCloseEvent',
        );
        expect((event as TerminatedCloseEvent).message).toBe(
          '4499: Terminated',
        );
        expect((event as TerminatedCloseEvent).code).toBe(4499);
        expect((event as TerminatedCloseEvent).reason).toBe('Terminated');
        expect((event as TerminatedCloseEvent).wasClean).toBeFalsy();
        done();
      },
    },
  });

  await waitForConnect();

  client.terminate();
});

describe('ping/pong', () => {
  it('should respond with a pong to a ping', async () => {
    expect.assertions(1);

    const { url, waitForConnect, waitForClient, waitForClientClose } =
      await startTServer();

    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    await waitForConnect();

    await waitForClient((client) => {
      client.send(stringifyMessage({ type: MessageType.Ping }));
      client.onMessage((data) => {
        expect(data).toBe('{"type":"pong"}');
      });
    });

    await waitForClientClose(() => {
      fail("Shouldn't have closed");
    }, 20);
  });

  it("should return ping's payload through the pong", async () => {
    expect.assertions(1);

    const { url, waitForConnect, waitForClient, waitForClientClose } =
      await startTServer();

    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    await waitForConnect();

    await waitForClient((client) => {
      client.send(
        stringifyMessage({
          type: MessageType.Ping,
          payload: { iCome: 'back' },
        }),
      );
      client.onMessage((data) => {
        expect(parseMessage(data)).toEqual({
          type: MessageType.Pong,
          payload: { iCome: 'back' },
        });
      });
    });

    await waitForClientClose(() => {
      fail("Shouldn't have closed");
    }, 20);
  });

  it('should not respond with a pong to a ping when disabled', async () => {
    const { url, waitForConnect, waitForClient, waitForClientClose } =
      await startTServer();

    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
      disablePong: true,
    });

    await waitForConnect();

    await waitForClient((client) => {
      client.send(stringifyMessage({ type: MessageType.Ping }));
      client.onMessage(() => {
        fail("Shouldn't have received a message");
      });
    });

    await waitForClientClose(() => {
      fail("Shouldn't have closed");
    }, 20);
  });

  it('should not react to a pong', async () => {
    const { url, waitForConnect, waitForClient, waitForClientClose } =
      await startTServer();

    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    await waitForConnect();

    await waitForClient((client) => {
      client.send(stringifyMessage({ type: MessageType.Pong }));
      client.onMessage(() => {
        fail("Shouldn't have received a message");
      });
    });

    await waitForClientClose(() => {
      fail("Shouldn't have closed");
    }, 20);
  });

  it('should ping the server after the keepAlive timeout', async (done) => {
    const { url, waitForConnect, waitForClient } = await startTServer();

    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
      keepAlive: 20,
    });

    await waitForConnect();

    await waitForClient((client) => {
      client.onMessage((data) => {
        expect(data).toBe('{"type":"ping"}');
        done();
      });
    });
  });
});

describe('query operation', () => {
  it('should execute the query, "next" the result and then complete', async () => {
    const { url } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub = tsubscribe(client, {
      query: 'query { getValue }',
    });

    await sub.waitForNext((result) => {
      expect(result).toEqual({ data: { getValue: 'value' } });
    });

    await sub.waitForComplete();
  });

  it('should accept nullish value for `operationName`, `variables` and `extensions`', async () => {
    const { url } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    // nothing
    await tsubscribe(client, {
      query: 'query { getValue }',
    }).waitForComplete();

    // undefined
    await tsubscribe(client, {
      operationName: undefined,
      query: 'query { getValue }',
      variables: undefined,
      extensions: undefined,
    }).waitForComplete();

    // null
    await tsubscribe(client, {
      operationName: null,
      query: 'query { getValue }',
      variables: null,
      extensions: null,
    }).waitForComplete();
  });
});

describe('subscription operation', () => {
  it('should execute and "next" the emitted results until disposed', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub = tsubscribe(client, {
      query: 'subscription Ping { ping }',
    });
    await server.waitForOperation();

    server.pong();
    server.pong();

    await sub.waitForNext((result) => {
      expect(result).toEqual({ data: { ping: 'pong' } });
    });
    await sub.waitForNext((result) => {
      expect(result).toEqual({ data: { ping: 'pong' } });
    });

    sub.dispose();

    server.pong();
    server.pong();

    await sub.waitForNext(() => {
      fail('Next shouldnt have been called');
    }, 10);
    await sub.waitForComplete();
  });

  it('should emit results to correct distinct sinks', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub1 = tsubscribe(client, {
      query: `subscription Ping($key: String!) {
        ping(key: $key)
      }`,
      variables: { key: '1' },
    });
    await server.waitForOperation();

    const sub2 = tsubscribe(client, {
      query: `subscription Ping($key: String!) {
        ping(key: $key)
      }`,
      variables: { key: '2' },
    });
    await server.waitForOperation();

    server.pong('1');
    await sub2.waitForNext(() => {
      fail('Shouldnt have nexted');
    }, 10);
    await sub1.waitForNext((result) => {
      expect(result).toEqual({
        data: { ping: 'pong' },
      });
    });

    server.pong('2');
    await sub1.waitForNext(() => {
      fail('Shouldnt have nexted');
    }, 10);
    await sub2.waitForNext((result) => {
      expect(result).toEqual({
        data: { ping: 'pong' },
      });
    });

    const sub3 = tsubscribe(client, {
      query: 'query { getValue }',
    });
    await server.waitForOperation();
    await sub1.waitForNext(() => {
      fail('Shouldnt have nexted');
    }, 10);
    await sub2.waitForNext(() => {
      fail('Shouldnt have nexted');
    }, 10);
    await sub3.waitForNext((result) => {
      expect(result).toEqual({ data: { getValue: 'value' } });
    });
    await sub3.waitForComplete();
  });

  it('should use the provided `generateID` for subscription IDs', async () => {
    const { url, ...server } = await startTServer();

    const generateIDFn = jest.fn(() => 'not unique');

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
      generateID: generateIDFn,
    });

    tsubscribe(client, {
      query: '{ getValue }',
    });
    await server.waitForOperation();

    expect(generateIDFn).toBeCalled();
  });

  it('should provide subscription payload in `generateID`', async () => {
    const { url, ...server } = await startTServer();

    const generateIDFn = jest.fn(() => '1');

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
      generateID: generateIDFn,
    });

    const payload = {
      query: '{ getValue }',
    };
    tsubscribe(client, payload);
    await server.waitForOperation();

    expect(generateIDFn).toBeCalledWith(payload);
  });

  it('should dispose of the subscription on complete', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub = tsubscribe(client, {
      query: '{ getValue }',
    });

    await sub.waitForComplete();

    await server.waitForClientClose();

    expect(server.getClients().length).toBe(0);
  });

  it('should dispose of the subscription on error', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub = tsubscribe(client, {
      query: '{ iDontExist }',
    });

    await sub.waitForError();

    await server.waitForClientClose();

    expect(server.getClients().length).toBe(0);
  });

  it('should stop dispatching messages after completing a subscription', async () => {
    const { url, getClients, waitForOperation, waitForComplete } =
      await startTServer();

    const sub = tsubscribe(
      createClient({ url, retryAttempts: 0, onNonLazyError: noop }),
      {
        query: 'subscription { greetings }',
      },
    );
    await waitForOperation();

    for (const client of getClients()) {
      client.onMessage(() => {
        // no more messages from the client
        fail("Shouldn't have dispatched a message");
      });
    }

    await waitForComplete();
    await sub.waitForComplete();
  });

  it('should not send a complete message after receiving complete', async () => {
    const { url, waitForClient, waitForClientClose } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      lazy: false,
      onNonLazyError: noop,
    });

    await waitForClient((client) => {
      client.onMessage((msg) => {
        if (parseMessage(msg).type === MessageType.Complete)
          fail("Shouldn't have sent a complete message");
      });
    });

    const sub = tsubscribe(client, {
      query: '{ getValue }',
    });
    await sub.waitForComplete();

    client.dispose();
    await waitForClientClose();
  });
});

describe('"concurrency"', () => {
  it('should dispatch and receive messages even if one subscriber disposes while another one subscribes', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub1 = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    await server.waitForOperation();

    sub1.dispose();
    const sub2 = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    await server.waitForOperation();

    server.pong();

    await sub2.waitForNext((result) => {
      expect(result).toEqual({ data: { ping: 'pong' } });
    });

    await sub1.waitForNext(() => {
      fail('Shouldnt have nexted');
    }, 10);
    await sub1.waitForComplete();

    expect(server.getClients().length).toBe(1);
  });
});

describe('lazy', () => {
  it('should connect immediately when mode is disabled', async () => {
    const { url, ...server } = await startTServer();

    createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
      lazy: false,
    });

    await server.waitForClient();
  });

  it('should close socket when disposing while mode is disabled', async () => {
    const { url, ...server } = await startTServer();

    // wait for connected
    const client = await new Promise<Client>((resolve) => {
      const client = createClient({
        url,
        lazy: false,
        retryAttempts: 0,
        onNonLazyError: noop,
      });
      client.on('connected', () => resolve(client));
    });

    client.dispose();

    await server.waitForClientClose();
  });

  it('should connect on first subscribe when mode is enabled', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // default
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    await server.waitForClient(() => {
      fail('Client shouldnt have appeared');
    }, 10);

    client.subscribe(
      {
        query: '{ getValue }',
      },
      {
        next: noop,
        error: noop,
        complete: noop,
      },
    );

    await server.waitForClient();
  });

  it('should disconnect on last unsubscribe when mode is enabled', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // default
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    await server.waitForClient(() => {
      fail('Client shouldnt have appeared');
    }, 10);

    const sub1 = tsubscribe(client, {
      operationName: 'PingPlease',
      query: 'subscription PingPlease { ping }',
    });
    await server.waitForOperation();

    const sub2 = tsubscribe(client, {
      operationName: 'Pong',
      query: 'subscription Pong($key: String!) { ping(key: $key) }',
      variables: { key: '1' },
    });
    await server.waitForOperation();

    sub1.dispose();
    await sub1.waitForComplete();

    // still is connected
    await server.waitForClientClose(() => {
      fail('Client should have closed');
    }, 10);

    // everyone unsubscribed
    sub2.dispose();
    await server.waitForClientClose();
  });

  it('should disconnect after the lazyCloseTimeout has passed after last unsubscribe', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // default
      lazyCloseTimeout: 20,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    await server.waitForOperation();

    // still is connected
    await server.waitForClientClose(() => {
      fail("Client shouldn't have closed");
    }, 10);

    // everyone unsubscribed
    sub.dispose();

    // still connected because of the lazyCloseTimeout
    await server.waitForClientClose(() => {
      fail("Client shouldn't have closed");
    }, 10);

    // but will close eventually
    await server.waitForClientClose();
  });

  it('should debounce close by lazyCloseTimeout', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // default
      lazyCloseTimeout: 10,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    // loop subscriptions and delay them by 5ms (while lazy close is 10ms)
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));

      await new Promise<void>((resolve, reject) => {
        client.subscribe(
          { query: '{ getValue }' },
          {
            next: () => {
              // noop
            },
            error: reject,
            complete: resolve,
          },
        );
      });
    }

    // if the debounce is set up incorrectly, a leftover timeout might close the connection earlier
    await server.waitForClientClose(() => {
      fail("Client shouldn't have closed");
    }, 5);
  });

  it('should report errors to the `onNonLazyError` callback', async (done) => {
    const { url, ...server } = await startTServer();

    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: (err) => {
        expect((err as CloseEvent).code).toBe(1005);
        done();
      },
    });

    await server.waitForClient((client) => {
      client.close();
    });
  });

  it('should not close connection if a subscription is disposed multiple times', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true,
      retryAttempts: 0,
    });

    // create 2 subscriptions
    const sub0 = tsubscribe(client, {
      query: 'subscription { ping(key: "0") }',
    });
    await server.waitForOperation();

    const sub1 = tsubscribe(client, {
      query: 'subscription { ping(key: "1") }',
    });
    await server.waitForOperation();

    // dispose of the 2nd subscription 2 times (try decrementing locks twice)
    sub1.dispose();
    sub1.dispose();

    // first subscription shouldnt complete and the client shouldnt disconnect
    await sub0.waitForComplete(() => {
      fail("subscription shouldn't have completed");
    }, 20);

    await server.waitForClientClose(() => {
      fail("client shouldn't have closed");
    }, 20);
  });
});

describe('reconnecting', () => {
  it('should not reconnect if retry attempts is zero', async () => {
    const { url, ...server } = await startTServer();

    const sub = tsubscribe(
      createClient({
        url,
        retryAttempts: 0,
        onNonLazyError: noop,
      }),
      {
        query: 'subscription { ping }',
      },
    );

    await server.waitForClient((client) => {
      client.close();
    });

    // client reported the error immediately, meaning it wont retry
    await sub.waitForError((err) => {
      expect((err as CloseEvent).code).toBe(1005);
    });
  });

  it('should reconnect silently after socket closes', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 3,
      retryWait: () => Promise.resolve(),
    });
    const sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });

    await server.waitForClient((client) => {
      client.close();
    });

    // retried
    await server.waitForClient((client) => {
      client.close();
    });

    // once more
    await server.waitForClient((client) => {
      client.close();
    });

    // and once more
    await server.waitForClient((client) => {
      client.close();
    });

    // client reported the error, meaning it wont retry anymore
    await sub.waitForError((err) => {
      expect((err as CloseEvent).code).toBe(1005);
    });
  });

  it('should resubscribe all subscribers on silent reconnects', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 1,
      retryWait: () => Promise.resolve(),
    });

    // add subscribers
    const subs: TSubscribe<unknown>[] = [];
    for (let i = 0; i < 50; i++) {
      subs.push(
        tsubscribe(client, {
          query: `subscription Sub${i} { ping(key: "${i}") }`,
        }),
      );
      await server.waitForOperation();
    }

    // retried
    await server.waitForClient((client) => {
      client.close();
    });
    // wait for all active subscribers to reconnect
    for (const _ of subs) {
      await server.waitForOperation();
    }

    // once more
    await server.waitForClient((client) => {
      client.close();
    });
    // wait for all active subscribers to reconnect
    for (const _ of subs) {
      await server.waitForOperation();
    }

    // and finally
    await server.waitForClient((client) => {
      client.close();
    });
    // wait for all active subscribers to reconnect
    for (const _ of subs) {
      await server.waitForOperation();
    }

    client.dispose();
  });

  it('should resubscribe all subscribers on silent reconnect when using retry wait delay', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 3,
      retryWait: () => new Promise((resolve) => setTimeout(resolve, 500)),
    });

    // add subscribers
    const subs: TSubscribe<unknown>[] = [];
    for (let i = 0; i < 50; i++) {
      subs.push(
        tsubscribe(client, {
          query: `subscription Sub${i} { ping(key: "${i}") }`,
        }),
      );
      await server.waitForOperation();
    }

    // connected
    await server.waitForClient((client) => {
      client.close();
    });

    // reconnected
    await server.waitForClient((client) => {
      client.close();
    });
    // once more
    await server.waitForClient((client) => {
      client.close();
    });

    await server.waitForClient();

    // wait for all active subscribers to reconnect
    for (const _ of subs) {
      await server.waitForOperation();
    }

    client.dispose();
  });

  it('should report some close events immediately and not reconnect', async () => {
    const { url, ...server } = await startTServer();

    async function testCloseCode(code: number) {
      const sub = tsubscribe(
        createClient({
          url,
          retryAttempts: Infinity, // keep retrying forever
          // even if all connection problems are fatal
          shouldRetry: () => false,
          // @deprecated
          isFatalConnectionProblem: () => true,
        }),
        {
          query: 'subscription { ping }',
        },
      );

      await server.waitForClient((client) => {
        client.close(code);
      });

      // client reported the error immediately, meaning it wont retry
      await sub.waitForError((err) => {
        expect((err as CloseEvent).code).toBe(code);
      });
    }

    const warn = console.warn;
    console.warn = () => {
      /* hide warnings for test */
    };
    await testCloseCode(CloseCode.SubprotocolNotAcceptable);
    console.warn = warn;
    await testCloseCode(CloseCode.InternalServerError);
    await testCloseCode(CloseCode.InternalClientError);
    await testCloseCode(CloseCode.BadRequest);
    await testCloseCode(CloseCode.BadResponse);
    await testCloseCode(CloseCode.Unauthorized);
    await testCloseCode(CloseCode.SubscriberAlreadyExists);
    await testCloseCode(CloseCode.TooManyInitialisationRequests);
  });

  it('should report fatal connection problems immediately', async () => {
    const { url, ...server } = await startTServer();

    const sub = tsubscribe(
      createClient({
        url,
        retryAttempts: Infinity, // keep retrying forever
        shouldRetry: (err) => {
          expect((err as CloseEvent).code).toBe(4444);
          expect((err as CloseEvent).reason).toBe('Is fatal?');
          return false;
        },
      }),
      {
        query: 'subscription { ping }',
      },
    );

    await server.waitForClient((client) => {
      client.close(4444, 'Is fatal?');
    });

    await sub.waitForError((err) => {
      expect((err as CloseEvent).code).toBe(4444);
    }, 20);
  });

  it('should report fatal connection problems immediately (using deprecated `isFatalConnectionProblem`)', async () => {
    const { url, ...server } = await startTServer();

    const sub = tsubscribe(
      createClient({
        url,
        retryAttempts: Infinity, // keep retrying forever
        isFatalConnectionProblem: (err) => {
          expect((err as CloseEvent).code).toBe(4444);
          expect((err as CloseEvent).reason).toBe('Is fatal?');
          return true;
        },
      }),
      {
        query: 'subscription { ping }',
      },
    );

    await server.waitForClient((client) => {
      client.close(4444, 'Is fatal?');
    });

    await sub.waitForError((err) => {
      expect((err as CloseEvent).code).toBe(4444);
    }, 20);
  });

  it('should allow retrying non-CloseEvent connection problems', async (done) => {
    let count = 0;
    createClient({
      url: 'ws://idontexitst.no',
      lazy: false,
      retryAttempts: 1,
      retryWait: () => Promise.resolve(),
      onNonLazyError: noop,
      shouldRetry: () => true,
      on: {
        connecting: () => {
          count++;
          if (count === 2) {
            done();
          }
        },
      },
    });
  });

  it.todo(
    'should attempt reconnecting silently a few times before closing for good',
  );

  it('should lazy disconnect after retries when all subscriptions are completed', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // behavior on lazy only
      retryAttempts: Infinity, // keep retrying forever
      retryWait: () => Promise.resolve(),
    });

    const sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });

    await server.waitForClient((client) => client.close());
    await server.waitForClientClose();

    await server.waitForClient((client) => client.close());
    await server.waitForClientClose();

    await server.waitForClient((client) => client.close());
    await server.waitForClientClose();

    // allow sub on the 3rd retry
    await server.waitForOperation();

    // dispose of the last and only subscription
    sub.dispose();
    await sub.waitForComplete();

    // client should now leave
    await server.waitForClientClose();

    // and no clients should be left
    expect(server.getClients().length).toBe(0);
  });

  it('should lazy disconnect even if subscription is created during retries after all get completed', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // behavior on lazy only
      retryAttempts: Infinity, // keep retrying forever
      retryWait: () => Promise.resolve(),
    });

    const sub1 = tsubscribe(client, {
      query: 'subscription { ping(key: "1") }',
    });

    await server.waitForClient((client) => client.close());
    await server.waitForClientClose();

    await server.waitForClient((client) => client.close());
    await server.waitForClientClose();

    const sub2 = tsubscribe(client, {
      query: 'subscription { ping(key: "2") }',
    });

    await server.waitForClient((client) => client.close());
    await server.waitForClientClose();

    // allow both subs on the 3rd retry
    await server.waitForOperation();
    await server.waitForOperation();

    // dispose of the first subscription
    sub1.dispose();
    await sub1.waitForComplete();

    // client should NOT leave yet
    await server.waitForClientClose(() => {
      fail("Client should've stayed connected");
    }, 10);

    // and client should still be connected
    expect(server.getClients().length).toBe(1);

    // dispose of the last subscription
    sub2.dispose();
    await sub2.waitForComplete();

    // client should leave now
    await server.waitForClientClose();

    // and all connections are gone
    expect(server.getClients().length).toBe(0);
  });

  it('should not reconnect if the subscription completes while waiting for a retry', async () => {
    const { url, ...server } = await startTServer();

    let retryAttempt = () => {
      /**/
    };
    const waitForRetryAttempt = () =>
      new Promise<void>((resolve) => (retryAttempt = resolve));
    let retry = () => {
      /**/
    };
    const client = createClient({
      url,
      retryAttempts: 2,
      retryWait: () => {
        retryAttempt();
        return new Promise((resolve) => (retry = resolve));
      },
    });

    // case 1

    // subscribe and wait for operation
    let sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    await server.waitForOperation();

    // close client then wait for retry attempt
    await server.waitForClient((client) => {
      client.close();
    });
    await waitForRetryAttempt();

    // complete subscription while waiting
    sub.dispose();

    retry();

    await server.waitForClient(() => {
      fail("Client shouldn't have reconnected");
    }, 20);

    // case 2

    // subscribe but close connection immediately (dont wait for operation)
    sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    retry(); // this still counts as a retry, so retry

    // close client then wait for retry attempt
    await server.waitForClient((client) => {
      client.close();
    });
    await waitForRetryAttempt();

    // complete subscription while waiting
    sub.dispose();

    retry();

    await server.waitForClient(() => {
      fail("Client shouldn't have reconnected");
    }, 20);
  });

  it('should not count lazy connect after succesful reconnect as another retry', async () => {
    const { url, ...server } = await startTServer();

    const retry = jest.fn();
    const client = createClient({
      url,
      retryAttempts: 1,
      retryWait: () => {
        retry();
        return Promise.resolve();
      },
    });

    let sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });

    // closed connection, retried and successfully subscribed
    await server.waitForClient((client) => {
      client.close();
    });
    await server.waitForClientClose();
    await server.waitForClient();

    // complete subscription and close connection (because lazy)
    sub.dispose();
    await server.waitForClientClose();

    // new subscription, connect again
    sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    await server.waitForClient();

    // complete subscription and close connection (because lazy)
    sub.dispose();
    await server.waitForClientClose();

    // only one retry had happened (for first subscription)
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('should subscribe even if socket is in CLOSING state due to all subscriptions being completed', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true,
      retryAttempts: 0,
    });

    // subscribe and wait for operation
    let sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });
    await server.waitForOperation();

    // complete the subscription
    sub.dispose();

    // give room for the socket close in the stack
    await new Promise((resolve) => setTimeout(resolve, 0));

    // immediately subscribe again
    sub = tsubscribe(client, {
      query: 'subscription { ping }',
    });

    // the new subscription should go through
    await server.waitForOperation();
  });
});

describe('events', () => {
  it('should emit to relevant listeners with expected arguments', async () => {
    const { url, ...server } = await startTServer();

    const connectingFn = jest.fn(noop as EventListener<'connecting'>);
    const openedFn = jest.fn(noop as EventListener<'opened'>);
    const connectedFn = jest.fn(noop as EventListener<'connected'>);
    const messageFn = jest.fn(noop as EventListener<'message'>);
    const closedFn = jest.fn(noop as EventListener<'closed'>);

    // wait for connected
    const [client, sub] = await new Promise<[Client, TSubscribe<unknown>]>(
      (resolve) => {
        const client = createClient({
          url,
          retryAttempts: 0,
          onNonLazyError: noop,
          on: {
            connecting: connectingFn,
            opened: openedFn,
            connected: connectedFn,
            message: messageFn,
            closed: closedFn,
          },
        });
        client.on('connecting', connectingFn);
        client.on('opened', openedFn);
        client.on('connected', connectedFn);
        client.on('message', messageFn);
        client.on('closed', closedFn);

        // trigger connecting
        const sub = tsubscribe(client, { query: 'subscription {ping}' });

        // resolve once subscribed
        server.waitForOperation().then(() => resolve([client, sub]));
      },
    );

    expect(connectingFn).toHaveBeenCalledTimes(2);
    expect(connectingFn.mock.calls[0].length).toBe(1);

    expect(openedFn).toHaveBeenCalledTimes(2); // initial and registered listener
    openedFn.mock.calls.forEach((cal) => {
      expect(cal[0]).toBeInstanceOf(WebSocket);
    });

    expect(connectedFn).toHaveBeenCalledTimes(2); // initial and registered listener
    connectedFn.mock.calls.forEach((cal) => {
      expect(cal[0]).toBeInstanceOf(WebSocket);
    });

    // (connection ack + pong) * 2
    server.pong();
    await sub.waitForNext();
    expect(messageFn).toHaveBeenCalledTimes(4);

    expect(closedFn).not.toBeCalled();

    server.getClients().forEach((client) => {
      client.close();
    });

    if (closedFn.mock.calls.length > 0) {
      // already closed
    } else {
      // wait for close
      await new Promise<void>((resolve) => {
        client.on('closed', () => resolve());
      });
    }

    // retrying is disabled
    expect(connectingFn).toHaveBeenCalledTimes(2);
    expect(openedFn).toHaveBeenCalledTimes(2);
    expect(connectedFn).toHaveBeenCalledTimes(2);

    expect(closedFn).toHaveBeenCalledTimes(2); // initial and registered listener
    closedFn.mock.calls.forEach((cal) => {
      // CloseEvent
      expect(cal[0]).toHaveProperty('code');
      expect(cal[0]).toHaveProperty('reason');
      expect(cal[0]).toHaveProperty('wasClean');
    });
  });

  it('should emit closed event when disposing', async (done) => {
    const { url, waitForClient } = await startTServer();

    const client = createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
      on: {
        closed: () => done(),
      },
    });

    await waitForClient();

    client.dispose();
  });

  it('should emit the websocket connection error', (done) => {
    const gotErr = jest.fn();
    createClient({
      url: 'ws://localhost/i/dont/exist',
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: (err) => {
        // connection error
        expect((err as ErrorEvent).error.code).toBe('ECONNREFUSED');
        expect(gotErr).toHaveBeenCalledTimes(2);
        done();
      },
      on: {
        closed: (err) => {
          // websocket closed
          expect((err as CloseEvent).code).toBe(1006);
          gotErr();
        },
        error: (err) => {
          // connection error
          expect((err as ErrorEvent).error.code).toBe('ECONNREFUSED');
          gotErr();
        },
      },
    });
  });

  it('should emit the websocket connection error on first subscribe in lazy mode', (done) => {
    // dont use expect.assertions(3) because https://github.com/facebook/jest/issues/8297
    const expected = jest.fn();

    const client = createClient({
      url: 'ws://localhost/i/dont/exist',
      retryAttempts: 0,
    });

    client.on('closed', (err) => {
      // websocket closed
      expect((err as CloseEvent).code).toBe(1006);
      expected();
    });

    client.on('error', (err) => {
      // connection error
      expect((err as ErrorEvent).error.code).toBe('ECONNREFUSED');
      expected();
    });

    client.subscribe(
      { query: '' },
      {
        next: noop,
        complete: noop,
        error: (err) => {
          // connection error
          expect((err as ErrorEvent).error.code).toBe('ECONNREFUSED');
          expect(expected).toHaveBeenCalledTimes(2);
          done();
        },
      },
    );
  });

  it('should emit ping and pong events when pinging server', async () => {
    const { url, ...server } = await startTServer();

    const pingFn = jest.fn(noop as EventListener<'ping'>);
    const pongFn = jest.fn(noop as EventListener<'pong'>);

    const client = createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
      keepAlive: 20,
      on: {
        ping: pingFn,
        pong: pongFn,
      },
    });
    client.on('ping', pingFn);
    client.on('pong', pongFn);

    await server.waitForConnect();

    await new Promise<void>((resolve, reject) => {
      server.waitForClient((client) => {
        client.onMessage((data) => {
          if (data === stringifyMessage({ type: MessageType.Ping })) resolve();
          else reject('Unexpected message');
        });
      });
    });

    await new Promise<void>((resolve) => {
      client.on('pong', () => resolve());
    });

    expect(pingFn).toHaveBeenCalledTimes(2);
    expect(pingFn.mock.calls[0][0]).toBeFalsy();
    expect(pingFn.mock.calls[0][1]).toBeUndefined();
    expect(pingFn.mock.calls[1][0]).toBeFalsy();
    expect(pingFn.mock.calls[1][1]).toBeUndefined();

    expect(pongFn).toHaveBeenCalledTimes(2);
    expect(pongFn.mock.calls[0][0]).toBeTruthy();
    expect(pongFn.mock.calls[0][1]).toBeUndefined();
    expect(pongFn.mock.calls[1][0]).toBeTruthy();
    expect(pongFn.mock.calls[1][1]).toBeUndefined();
  });

  it('should emit ping and pong events when receiving server pings', async () => {
    const { url, ...server } = await startTServer();

    const pingFn = jest.fn(noop as EventListener<'ping'>);
    const pongFn = jest.fn(noop as EventListener<'pong'>);

    const client = createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      onNonLazyError: noop,
      on: {
        ping: pingFn,
        pong: pongFn,
      },
    });
    client.on('ping', pingFn);
    client.on('pong', pongFn);

    await server.waitForClient((client) => {
      client.send(
        stringifyMessage({ type: MessageType.Ping, payload: { some: 'data' } }),
      );
    });

    await new Promise<void>((resolve) => {
      client.on('pong', () => resolve());
    });

    expect(pingFn).toHaveBeenCalledTimes(2);
    expect(pingFn.mock.calls[0][0]).toBeTruthy();
    expect(pingFn.mock.calls[0][1]).toEqual({ some: 'data' });
    expect(pingFn.mock.calls[1][0]).toBeTruthy();
    expect(pingFn.mock.calls[1][1]).toEqual({ some: 'data' });

    expect(pongFn).toHaveBeenCalledTimes(2);
    expect(pongFn.mock.calls[0][0]).toBeFalsy();
    expect(pongFn.mock.calls[0][1]).toEqual({ some: 'data' });
    expect(pongFn.mock.calls[1][0]).toBeFalsy();
    expect(pongFn.mock.calls[1][1]).toEqual({ some: 'data' });
  });

  it('should provide the latest socket reference to event listeners', async () => {
    // dont use expect.assertions(6) because https://github.com/facebook/jest/issues/8297
    const expected = jest.fn();

    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: false,
      retryAttempts: 1,
      onNonLazyError: noop,
      on: {
        opened: (socket) => {
          // only latest socket can be open
          const sock = socket as WebSocket;
          expect(sock.readyState).toBe(sock.OPEN);
          expected();
        },
        connected: (socket) => {
          // only latest socket can be open
          const sock = socket as WebSocket;
          expect(sock.readyState).toBe(sock.OPEN);
          expected();
        },
      },
    });

    await tsubscribe(client, { query: '{ getValue }' }).waitForComplete();

    server.getClients().forEach((client) => {
      client.close(4321);
    });
    await new Promise<void>((resolve) => {
      const dispose = client.on('closed', () => {
        dispose();
        resolve();
      });
    });

    await tsubscribe(client, { query: '{ getValue }' }).waitForComplete();

    server.getClients().forEach((client) => {
      client.close(4321);
    });
    await new Promise<void>((resolve) => {
      const dispose = client.on('closed', () => {
        dispose();
        resolve();
      });
    });

    await tsubscribe(client, { query: '{ getValue }' }).waitForComplete();

    // opened and connected should be called 6 times (3 times connected, 2 times disconnected)
    expect(expected).toHaveBeenCalledTimes(6);
  });
});

describe('iterate', () => {
  it('should iterate a single result query', async () => {
    const { url } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const iterator = client.iterate({
      query: '{ getValue }',
    });

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": false,
        "value": {
          "data": {
            "getValue": "value",
          },
        },
      }
    `);

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": true,
        "value": undefined,
      }
    `);
  });

  it('should iterate over subscription events', async () => {
    const { url } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const iterator = client.iterate({
      query: 'subscription { greetings }',
    });

    // Hi
    await expect(iterator.next()).resolves.toBeDefined();
    // Bonjour
    await expect(iterator.next()).resolves.toBeDefined();
    // Hola
    await expect(iterator.next()).resolves.toBeDefined();
    // Ciao
    await expect(iterator.next()).resolves.toBeDefined();
    // Zdravo
    await expect(iterator.next()).resolves.toBeDefined();

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": true,
        "value": undefined,
      }
    `);
  });

  it('should report execution errors to iterator', async () => {
    const { url } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const iterator = client.iterate({
      query: 'subscription { throwing }',
    });

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": false,
        "value": {
          "errors": [
            {
              "locations": [
                {
                  "column": 16,
                  "line": 1,
                },
              ],
              "message": "Kaboom!",
              "path": [
                "throwing",
              ],
            },
          ],
        },
      }
    `);

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": true,
        "value": undefined,
      }
    `);
  });

  it('should throw in iterator connection errors', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const pingKey = Math.random().toString();
    const iterator = client.iterate({
      query: `subscription { ping(key: "${pingKey}") }`,
    });

    pong(pingKey);
    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": false,
        "value": {
          "data": {
            "ping": "pong",
          },
        },
      }
    `);

    await server.dispose(false);

    await expect(iterator.next()).rejects.toEqual(
      // forceful close
      expect.objectContaining({
        code: 1006,
        reason: '',
      }),
    );
  });

  it('should complete subscription when iterator loop breaks', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const pingKey = Math.random().toString();
    const iterator = client.iterate({
      query: `subscription { ping(key: "${pingKey}") }`,
    });
    iterator.return = jest.fn(iterator.return);

    setTimeout(() => pong(pingKey), 0);

    for await (const val of iterator) {
      expect(val).toMatchInlineSnapshot(`
        {
          "data": {
            "ping": "pong",
          },
        }
      `);
      break;
    }

    expect(iterator.return).toHaveBeenCalled();

    await server.waitForClientClose();
  });

  it('should complete subscription when iterator loop throws', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const pingKey = Math.random().toString();
    const iterator = client.iterate({
      query: `subscription { ping(key: "${pingKey}") }`,
    });
    iterator.return = jest.fn(iterator.return);

    setTimeout(() => pong(pingKey), 0);

    await expect(async () => {
      for await (const val of iterator) {
        expect(val).toMatchInlineSnapshot(`
          {
            "data": {
              "ping": "pong",
            },
          }
        `);
        throw new Error(':)');
      }
    }).rejects.toBeDefined();

    expect(iterator.return).toHaveBeenCalled();

    await server.waitForClientClose();
  });

  it('should complete subscription when calling return directly on iterator', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 0,
      onNonLazyError: noop,
    });

    const pingKey = Math.random().toString();
    const iterator = client.iterate({
      query: `subscription { ping(key: "${pingKey}") }`,
    });

    pong(pingKey);

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": false,
        "value": {
          "data": {
            "ping": "pong",
          },
        },
      }
    `);

    await expect(iterator.return?.()).resolves.toMatchInlineSnapshot(`
      {
        "done": true,
        "value": undefined,
      }
    `);

    await expect(iterator.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": true,
        "value": undefined,
      }
    `);

    await server.waitForClientClose();
  });
});
