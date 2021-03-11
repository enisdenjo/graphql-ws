/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { startTServer } from './fixtures/simple';
import { createClient, Client, EventListener } from '../client';
import { SubscribePayload } from '../message';

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
  waitForNext: (test?: (value: T) => void, expire?: number) => Promise<void>;
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
  const results: T[] = [];
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
        if (results.length > 0) {
          return done();
        }
        emitter.once('next', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('next', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    waitForError: (test, expire) => {
      return new Promise((resolve) => {
        function done() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          test?.(error);
          resolve();
        }
        if (error) {
          return done();
        }
        emitter.once('err', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('err', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    waitForComplete: (test, expire) => {
      return new Promise((resolve) => {
        function done() {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          test?.();
          resolve();
        }
        if (completed) {
          return done();
        }
        emitter.once('complete', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('complete', done); // expired
            resolve();
          }, expire);
        }
      });
    },
    dispose,
  };
}

/**
 * Tests
 */

it('should use the provided WebSocket implementation', async () => {
  const { url, ...server } = await startTServer();

  Object.assign(global, {
    WebSocket: null,
  });

  createClient({
    url,
    retryAttempts: 0,
    onNonLazyError: noop,
    lazy: false,
    webSocketImpl: WebSocket,
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

it('should close with error message during connecting issues', async () => {
  const { url } = await startTServer();

  const someerr = new Error('Welcome');
  const client = createClient({
    url,
    retryAttempts: 0,
    onNonLazyError: noop,
    on: {
      connected: () => {
        // the `connected` listener is called right before successful connection
        throw someerr;
      },
    },
  });

  const sub = tsubscribe(client, {
    query: 'query { getValue }',
  });

  await sub.waitForError((err) => {
    const event = err as CloseEvent;
    expect(event.code).toBe(4400);
    expect(event.reason).toBe('Welcome');
    expect(event.wasClean).toBeTruthy();
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

it('should close the socket if the `connectionParams` rejects or throws', async () => {
  const server = await startTServer();

  let client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    connectionParams: () => {
      throw new Error('No auth?');
    },
  });

  let sub = tsubscribe(client, { query: '{ getValue }' });
  await sub.waitForError((err) => {
    const event = err as CloseEvent;
    expect(event.code).toBe(4400);
    expect(event.reason).toBe('No auth?');
    expect(event.wasClean).toBeTruthy();
  });

  client = createClient({
    url: server.url,
    retryAttempts: 0,
    onNonLazyError: noop,
    connectionParams: () => Promise.reject(new Error('No auth?')),
  });

  sub = tsubscribe(client, { query: '{ getValue }' });
  await sub.waitForError((err) => {
    const event = err as CloseEvent;
    expect(event.code).toBe(4400);
    expect(event.reason).toBe('No auth?');
    expect(event.wasClean).toBeTruthy();
  });
});

it('should not send the complete message if the socket is not open', async () => {
  const {
    url,
    clients,
    waitForOperation,
    waitForClientClose,
  } = await startTServer();

  class MockWebSocket extends WebSocket {
    constructor(...args: unknown[]) {
      // @ts-expect-error Args will fit
      super(...args);
    }

    public send(data: unknown) {
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

  // kick the client off
  for (const client of clients) {
    client.close();
    await waitForClientClose();
  }

  // dispose of the subscription which should complete the connection
  sub.dispose();
  await sub.waitForComplete();
});

it('should pass the emitted websocket connection error to non-lazy error handler', (done) => {
  expect.assertions(3);
  createClient({
    url: 'ws://localhost/i/dont/exist',
    lazy: false,
    retryAttempts: 0,
    onNonLazyError: (err) => {
      expect(err).toHaveProperty('message');
      expect((err as ErrorEvent).message).toBe(
        'connect ECONNREFUSED 127.0.0.1:80',
      );
      done();
    },
    on: {
      closed: (err) => {
        // even though error is thrown, dispatch a close event
        expect((err as CloseEvent).code).toBe(1006);
      },
    },
  });
});

it("should pass the emitted websocket connection error to the subscriber's sink", (done) => {
  expect.assertions(3);

  const client = createClient({
    url: 'ws://localhost/i/dont/exist',
    retryAttempts: 0,
  });

  client.on('closed', (err) => {
    // even though error is thrown, dispatch a close event
    expect((err as CloseEvent).code).toBe(1006);
  });

  client.subscribe(
    { query: '' },
    {
      next: noop,
      complete: noop,
      error: (err) => {
        expect(err).toHaveProperty('message');
        expect((err as ErrorEvent).message).toBe(
          'connect ECONNREFUSED 127.0.0.1:80',
        );
        done();
      },
    },
  );
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

  it('should accept nullish value for `operationName` and `variables`', async () => {
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
    }).waitForComplete();

    // null
    await tsubscribe(client, {
      operationName: null,
      query: 'query { getValue }',
      variables: null,
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

    expect(server.clients.size).toBe(0);
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

    expect(server.clients.size).toBe(0);
  });

  it('should stop dispatching messages after completing a subscription', async () => {
    const {
      url,
      clients,
      waitForOperation,
      waitForComplete,
    } = await startTServer();

    const sub = tsubscribe(
      createClient({ url, retryAttempts: 0, onNonLazyError: noop }),
      {
        query: 'subscription { greetings }',
      },
    );
    await waitForOperation();

    for (const client of clients) {
      client.once('message', () => {
        // no more messages from the client
        fail("Shouldn't have dispatched a message");
      });
    }

    await waitForComplete();
    await sub.waitForComplete();
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

    expect(server.clients.size).toBe(1);
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
        on: {
          connected: () => resolve(client),
        },
      });
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

  it('should disconnect after the keepAlive has passed after last unsubscribe', async () => {
    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      lazy: true, // default
      keepAlive: 20,
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

    // still connected because of the keepAlive
    await server.waitForClientClose(() => {
      fail("Client shouldn't have closed");
    }, 10);

    // but will close eventually
    await server.waitForClientClose();
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
    expect.assertions(1);
    await sub.waitForError((err) => {
      expect((err as CloseEvent).code).toBe(1005);
    }, 20);
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
    expect.assertions(1);
    await sub.waitForError((err) => {
      expect((err as CloseEvent).code).toBe(1005);
    }, 20);
  });

  it('should resubscribe all subscribers on silent reconnects', async () => {
    const defaultMaxListeners = EventEmitter.defaultMaxListeners;
    EventEmitter.defaultMaxListeners = 50; // for test

    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 1,
      retryWait: () => Promise.resolve(),
    });

    // add subscribers
    const subs: TSubscribe<unknown>[] = [];
    for (let i = 0; i < EventEmitter.defaultMaxListeners - 1; i++) {
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

    EventEmitter.defaultMaxListeners = defaultMaxListeners; // reset
  });

  it('should resubscribe all subscribers on silent reconnect when using retry wait delay', async () => {
    const defaultMaxListeners = EventEmitter.defaultMaxListeners;
    EventEmitter.defaultMaxListeners = 50; // for test

    const { url, ...server } = await startTServer();

    const client = createClient({
      url,
      retryAttempts: 3,
      retryWait: () => new Promise((resolve) => setTimeout(resolve, 500)),
    });

    // add subscribers
    const subs: TSubscribe<unknown>[] = [];
    for (let i = 0; i < EventEmitter.defaultMaxListeners - 1; i++) {
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

    EventEmitter.defaultMaxListeners = defaultMaxListeners; // reset
  });

  it('should report some close events immediately and not reconnect', async () => {
    const { url, ...server } = await startTServer();

    async function testCloseCode(code: number) {
      const sub = tsubscribe(
        createClient({
          url,
          retryAttempts: Infinity, // keep retrying forever
          isFatalConnectionProblem: () => true, // even if all connection probles are fatal
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
      }, 20);
    }

    expect.assertions(6);
    const warn = console.warn;
    console.warn = () => {
      /* hide warnings for test */
    };
    await testCloseCode(1002);
    console.warn = warn;
    await testCloseCode(1011);
    await testCloseCode(4400);
    await testCloseCode(4401);
    await testCloseCode(4409);
    await testCloseCode(4429);
  });

  it('should report fatal connection problems immediately', async () => {
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

  it.todo(
    'should attempt reconnecting silently a few times before closing for good',
  );
});

describe('events', () => {
  it('should emit to relevant listeners with expected arguments', async () => {
    const { url, ...server } = await startTServer();

    const connectingFn = jest.fn(noop as EventListener<'connecting'>);
    const connectedFn = jest.fn(noop as EventListener<'connected'>);
    const closedFn = jest.fn(noop as EventListener<'closed'>);

    // wait for connected
    const client = await new Promise<Client>((resolve) => {
      const client = createClient({
        url,
        retryAttempts: 0,
        onNonLazyError: noop,
        on: {
          connecting: connectingFn,
          connected: connectedFn,
          closed: closedFn,
        },
      });
      client.on('connecting', connectingFn);
      client.on('connected', (...args) => {
        connectedFn(...args);
        resolve(client);
      });
      client.on('closed', closedFn);

      // trigger connecting
      tsubscribe(client, { query: 'subscription {ping}' });
    });

    expect(connectingFn).toBeCalledTimes(2);
    expect(connectingFn.mock.calls[0].length).toBe(0);

    expect(connectedFn).toBeCalledTimes(2); // initial and registered listener
    connectedFn.mock.calls.forEach((cal) => {
      expect(cal[0]).toBeInstanceOf(WebSocket);
    });

    expect(closedFn).not.toBeCalled();

    server.clients.forEach((client) => {
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
    expect(connectingFn).toBeCalledTimes(2);
    expect(connectedFn).toBeCalledTimes(2);

    expect(closedFn).toBeCalledTimes(2); // initial and registered listener
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
});
