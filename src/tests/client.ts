/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { url, startTServer, TServer, pubsub } from './fixtures/simple';
import { createClient, Client, EventListener } from '../client';
import { SubscribePayload } from '../message';

// Just does nothing
function noop(): void {
  /**/
}

/** Waits for the specified timeout and then resolves the promise. */
const wait = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

let server: TServer, forgottenDispose: TServer['dispose'] | undefined;
beforeEach(async () => {
  Object.assign(global, { WebSocket: WebSocket });
  const { dispose, ...rest } = await startTServer();
  forgottenDispose = dispose;
  server = {
    ...rest,
    dispose: (beNice) =>
      dispose(beNice).then(() => (forgottenDispose = undefined)),
  };
});
afterEach(async () => {
  if (forgottenDispose) {
    await forgottenDispose();
    forgottenDispose = undefined;
  }
});

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
  const values: T[] = [];
  let error: unknown,
    completed = false;
  const dispose = client.subscribe<T>(payload, {
    next: (value) => {
      values.push(value);
      emitter.emit('next');
    },
    error: (err) => {
      error = err;
      emitter.emit('error');
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
          test?.(values.shift()!);
          resolve();
        }
        if (values.length > 0) {
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
        if (completed) {
          return done();
        }
        emitter.once('error', done);
        if (expire) {
          setTimeout(() => {
            emitter.off('error', done); // expired
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
  Object.assign(global, {
    WebSocket: null,
  });

  createClient({
    url,
    lazy: false,
    webSocketImpl: WebSocket,
  });

  await server.waitForClient();
});

it('should not accept invalid WebSocket implementations', async () => {
  Object.assign(global, {
    WebSocket: null,
  });

  expect(() =>
    createClient({
      url,
      lazy: false,
      webSocketImpl: {},
    }),
  ).toThrow();
});

describe('query operation', () => {
  it('should execute the query, "next" the result and then complete', async () => {
    const client = createClient({ url });

    const sub = tsubscribe(client, {
      query: 'query { getValue }',
    });

    await sub.waitForNext((result) => {
      expect(result).toEqual({ data: { getValue: 'value' } });
    });

    await sub.waitForComplete();
  });
});

describe('subscription operation', () => {
  it('should execute and "next" the emitted results until disposed', async () => {
    const client = createClient({ url });

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
    const client = createClient({ url });

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
    const generateIDFn = jest.fn(() => 'not unique');

    const client = createClient({ url, generateID: generateIDFn });

    client.subscribe(
      {
        query: `subscription {
          boughtBananas {
            name
          }
        }`,
      },
      {
        next: noop,
        error: () => {
          fail(`Unexpected error call`);
        },
        complete: noop,
      },
    );
    await wait(10);

    expect(generateIDFn).toBeCalled();
  });

  it('should dispose of the subscription on complete', async () => {
    const client = createClient({ url });

    const completeFn = jest.fn();
    client.subscribe(
      {
        query: `{
          getValue
        }`,
      },
      {
        next: noop,
        error: () => {
          fail(`Unexpected error call`);
        },
        complete: completeFn,
      },
    );
    await wait(20);

    expect(completeFn).toBeCalled();

    await wait(20);
    expect(server.server.webSocketServer.clients.size).toBe(0);
  });

  it('should dispose of the subscription on error', async () => {
    const client = createClient({ url });

    const errorFn = jest.fn();
    client.subscribe(
      {
        query: `{
          iDontExist
        }`,
      },
      {
        next: noop,
        error: errorFn,
        complete: noop,
      },
    );
    await wait(20);

    expect(errorFn).toBeCalled();

    await wait(20);
    expect(server.server.webSocketServer.clients.size).toBe(0);
  });
});

describe('"concurrency"', () => {
  it('should dispatch and receive messages even if one subscriber disposes while another one subscribes', async () => {
    const client = createClient({ url });

    const nextFnForHappy = jest.fn();
    const completeFnForHappy = jest.fn();
    let disposeOfHappy: () => void;
    setTimeout(() => {
      disposeOfHappy = client.subscribe(
        {
          operationName: 'BecomingHappy',
          query: `subscription BecomingHappy($secret: String!) {
            becameHappy(secret: $secret) {
              name
            }
          }`,
          variables: { secret: 'there is no secret' },
        },
        {
          next: nextFnForHappy,
          error: () => {
            fail(`Unexpected error call`);
          },
          complete: completeFnForHappy,
        },
      );
    });

    const nextFnForBananas = jest.fn();
    const completeFnForBananas = jest.fn();
    setTimeout(async () => {
      disposeOfHappy();

      await wait(10);

      client.subscribe(
        {
          query: `subscription {
            boughtBananas {
              name
            }
          }`,
        },
        {
          next: nextFnForBananas,
          error: () => {
            fail(`Unexpected error call`);
          },
          complete: completeFnForBananas,
        },
      );

      await wait(10);

      pubsub.publish('boughtBananas', {
        boughtBananas: {
          name: 'john',
        },
      });
    });

    await wait(30);

    expect(nextFnForHappy).not.toBeCalled();
    expect(completeFnForHappy).toBeCalled();
    expect(nextFnForBananas).toBeCalled();
  });
});

describe('lazy', () => {
  it('should connect immediately when mode is disabled', async () => {
    createClient({
      url,
      lazy: false,
    });
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(1);
    server.server.webSocketServer.clients.forEach((client) => {
      expect(client.readyState).toBe(WebSocket.OPEN);
    });
  });

  it('should close socket when disposing while mode is disabled', async () => {
    const client = createClient({
      url,
      lazy: false,
    });
    await wait(10);

    client.dispose();
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(0);
  });

  it('should connect on first subscribe when mode is enabled', async () => {
    const client = createClient({
      url,
      lazy: true, // default
    });
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(0);

    client.subscribe(
      {
        query: `subscription {
          boughtBananas {
            name
          }
        }`,
      },
      {
        next: noop,
        error: noop,
        complete: noop,
      },
    );
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(1);
    server.server.webSocketServer.clients.forEach((client) => {
      expect(client.readyState).toBe(WebSocket.OPEN);
    });
  });

  it('should disconnect on last unsubscribe when mode is enabled', async () => {
    const client = createClient({
      url,
      lazy: true, // default
    });
    await wait(10);

    const disposeClient1 = client.subscribe(
      {
        operationName: 'BoughtBananas',
        query: `subscription BoughtBananas {
          boughtBananas {
            name
          }
        }`,
      },
      {
        next: noop,
        error: noop,
        complete: noop,
      },
    );
    await wait(10);

    const disposeClient2 = client.subscribe(
      {
        operationName: 'BecomingHappy',
        query: `subscription BecomingHappy {
          becameHappy(secret: "live in the moment") {
            name
          }
        }`,
        variables: {},
      },
      {
        next: noop,
        error: noop,
        complete: noop,
      },
    );
    await wait(10);

    disposeClient1();
    await wait(10);

    // still connected
    expect(server.server.webSocketServer.clients.size).toBe(1);

    // everyone unsubscribed
    disposeClient2();
    await wait(10);
    expect(server.server.webSocketServer.clients.size).toBe(0);
  });
});

describe('reconnecting', () => {
  it('should not reconnect if retry attempts is zero', async () => {
    createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      retryTimeout: 10, // fake timeout
    });
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(1);

    server.server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(0);

    await wait(20);
    expect(server.server.webSocketServer.clients.size).toBe(0); // never reconnected
  });

  it('should reconnect silently after socket closes', async () => {
    createClient({
      url,
      lazy: false,
      retryAttempts: 1,
      retryTimeout: 10,
    });
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(1);

    server.server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(10);

    expect(server.server.webSocketServer.clients.size).toBe(0);

    await wait(20);
    expect(server.server.webSocketServer.clients.size).toBe(1);
  });

  it.todo(
    'should attempt reconnecting silently a few times before closing for good',
  );
});

describe('events', () => {
  it('should emit to relevant listeners with expected arguments', async () => {
    const connectingFn = jest.fn(noop as EventListener<'connecting'>);
    const connectedFn = jest.fn(noop as EventListener<'connected'>);
    const closedFn = jest.fn(noop as EventListener<'closed'>);

    const client = createClient({
      url,
      lazy: false,
      retryAttempts: 0,
      on: {
        connecting: connectingFn,
        connected: connectedFn,
        closed: closedFn,
      },
    });
    client.on('connecting', connectingFn);
    client.on('connected', connectedFn);
    client.on('closed', closedFn);
    await wait(10);

    expect(connectingFn).toBeCalledTimes(1); // only once because `client.on` missed the initial connecting event
    expect(connectingFn.mock.calls[0].length).toBe(0);

    expect(connectedFn).toBeCalledTimes(2); // initial and registered listener
    connectedFn.mock.calls.forEach((cal) => {
      expect(cal[0]).toBeInstanceOf(WebSocket);
    });

    expect(closedFn).not.toBeCalled();

    server.server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(10);

    // retrying is disabled
    expect(connectingFn).toBeCalledTimes(1);
    expect(connectedFn).toBeCalledTimes(2);

    expect(closedFn).toBeCalledTimes(2); // initial and registered listener
    closedFn.mock.calls.forEach((cal) => {
      // CloseEvent
      expect(cal[0]).toHaveProperty('code');
      expect(cal[0]).toHaveProperty('reason');
      expect(cal[0]).toHaveProperty('wasClean');
    });
  });
});
