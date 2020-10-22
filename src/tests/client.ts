/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { url, startServer, pubsub } from './fixtures/simple';
import { Server } from '../server';
import { createClient, EventListener } from '../client';

// Just does nothing
export function noop(): void {
  /**/
}

/** Waits for the specified timeout and then resolves the promise. */
const wait = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

let server: Server, dispose: (() => Promise<void>) | undefined;
beforeEach(async () => {
  Object.assign(global, {
    WebSocket: WebSocket,
  });

  [server, dispose] = await startServer();
});
afterEach(async () => {
  if (dispose) {
    await dispose();
  }
  dispose = undefined;
});

it('should use the provided WebSocket implementation', async () => {
  Object.assign(global, {
    WebSocket: null,
  });

  createClient({
    url,
    lazy: false,
    webSocketImpl: WebSocket,
  });

  await wait(10);

  expect(server.webSocketServer.clients.size).toBe(1);
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
  it('should execute the query, "next" the result and then complete', (done) => {
    const client = createClient({ url });

    client.subscribe(
      {
        query: `query {
          getValue
        }`,
      },
      {
        next: (result) => {
          expect(result).toEqual({ data: { getValue: 'value' } });
        },
        error: () => {
          fail(`Unexpected error call`);
        },
        complete: done,
      },
    );
  });
});

describe('subscription operation', () => {
  it('should execute and "next" the emitted results until disposed', async () => {
    const client = createClient({ url });

    const nextFn = jest.fn();
    const completeFn = jest.fn();

    const dispose = client.subscribe(
      {
        operationName: 'BecomingHappy',
        query: `subscription BecomingHappy($secret: String!) {
          becameHappy(secret: $secret) {
            name
          }
        }`,
        variables: { secret: 'drink water' },
      },
      {
        next: nextFn,
        error: () => {
          fail(`Unexpected error call`);
        },
        complete: completeFn,
      },
    );

    await wait(10);

    pubsub.publish('becameHappy', {
      becameHappy: {
        name: 'john',
      },
    });

    pubsub.publish('becameHappy', {
      becameHappy: {
        name: 'jane',
      },
    });

    await wait(10);

    expect(nextFn).toHaveBeenNthCalledWith(1, {
      data: { becameHappy: { name: 'john' } },
    });
    expect(nextFn).toHaveBeenNthCalledWith(2, {
      data: { becameHappy: { name: 'jane' } },
    });
    expect(completeFn).not.toBeCalled();

    dispose();

    pubsub.publish('becameHappy', {
      becameHappy: {
        name: 'jeff',
      },
    });

    pubsub.publish('becameHappy', {
      becameHappy: {
        name: 'jenny',
      },
    });

    await wait(10);

    expect(nextFn).toBeCalledTimes(2);
    expect(completeFn).toBeCalled();
  });

  it('should emit results to correct distinct sinks', async () => {
    const client = createClient({ url });

    const nextFnForHappy = jest.fn();
    const completeFnForHappy = jest.fn();
    const disposeHappy = client.subscribe(
      {
        operationName: 'BecomingHappy',
        query: `subscription BecomingHappy($secret: String!) {
          becameHappy(secret: $secret) {
            name
          }
        }`,
        variables: { secret: 'live life' },
      },
      {
        next: nextFnForHappy,
        error: () => {
          fail(`Unexpected error call`);
        },
        complete: completeFnForHappy,
      },
    );
    await wait(10);

    const nextFnForBananas = jest.fn();
    const completeFnForBananas = jest.fn();
    const disposeBananas = client.subscribe(
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

    pubsub.publish('becameHappy', {
      becameHappy: {
        name: 'john',
      },
    });

    pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'jane',
      },
    });

    await wait(10);

    expect(nextFnForHappy).toBeCalledTimes(1);
    expect(nextFnForHappy).toBeCalledWith({
      data: { becameHappy: { name: 'john' } },
    });

    expect(nextFnForBananas).toBeCalledTimes(1);
    expect(nextFnForBananas).toBeCalledWith({
      data: { boughtBananas: { name: 'jane' } },
    });

    disposeHappy();

    pubsub.publish('becameHappy', {
      becameHappy: {
        name: 'jeff',
      },
    });

    pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'jenny',
      },
    });

    await wait(10);

    expect(nextFnForHappy).toHaveBeenCalledTimes(1);
    expect(completeFnForHappy).toBeCalled();

    expect(nextFnForBananas).toHaveBeenNthCalledWith(2, {
      data: { boughtBananas: { name: 'jenny' } },
    });

    disposeBananas();

    pubsub.publish('boughtBananas', {
      boughtBananas: {
        name: 'jack',
      },
    });

    await wait(10);

    expect(nextFnForBananas).toHaveBeenCalledTimes(2);
    expect(completeFnForBananas).toBeCalled();
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
    expect(server.webSocketServer.clients.size).toBe(0);
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
    expect(server.webSocketServer.clients.size).toBe(0);
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

    expect(server.webSocketServer.clients.size).toBe(1);
    server.webSocketServer.clients.forEach((client) => {
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

    expect(server.webSocketServer.clients.size).toBe(0);
  });

  it('should connect on first subscribe when mode is enabled', async () => {
    const client = createClient({
      url,
      lazy: true, // default
    });
    await wait(10);

    expect(server.webSocketServer.clients.size).toBe(0);

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

    expect(server.webSocketServer.clients.size).toBe(1);
    server.webSocketServer.clients.forEach((client) => {
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
    expect(server.webSocketServer.clients.size).toBe(1);

    // everyone unsubscribed
    disposeClient2();
    await wait(10);
    expect(server.webSocketServer.clients.size).toBe(0);
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

    expect(server.webSocketServer.clients.size).toBe(1);

    server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(10);

    expect(server.webSocketServer.clients.size).toBe(0);

    await wait(20);
    expect(server.webSocketServer.clients.size).toBe(0); // never reconnected
  });

  it('should reconnect silently after socket closes', async () => {
    createClient({
      url,
      lazy: false,
      retryAttempts: 1,
      retryTimeout: 10,
    });
    await wait(10);

    expect(server.webSocketServer.clients.size).toBe(1);

    server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(10);

    expect(server.webSocketServer.clients.size).toBe(0);

    await wait(20);
    expect(server.webSocketServer.clients.size).toBe(1);
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

    server.webSocketServer.clients.forEach((client) => {
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
