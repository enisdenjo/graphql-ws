/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { url, startServer, pubsub } from './fixtures/simple';
import { Server } from '../server';
import { createClient, EventListener } from '../client';
import { noop } from '../utils';

/** Waits for the specified timeout and then resolves the promise. */
const wait = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

Object.assign(global, {
  WebSocket: WebSocket,
});

let server: Server, dispose: (() => Promise<void>) | undefined;
beforeEach(async () => {
  [server, dispose] = await startServer();
});
afterEach(async () => {
  if (dispose) {
    await dispose();
  }
  dispose = undefined;
});

describe('query operation', () => {
  it('should execute the query, "next" the result and then complete', (done) => {
    const client = createClient({ url });

    client.subscribe(
      {
        operationName: 'ValueGetter',
        query: `query ValueGetter {
          getValue
        }`,
        variables: {},
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
        query: `subscription BecomingHappy {
          becameHappy {
            name
          }
        }`,
        variables: {},
      },
      {
        next: nextFn,
        error: () => {
          fail(`Unexpected error call`);
        },
        complete: completeFn,
      },
    );

    await wait(5);

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

    await wait(5);

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

    await wait(5);

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
        query: `subscription BecomingHappy {
          becameHappy {
            name
          }
        }`,
        variables: {},
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
        operationName: 'BoughtBananas',
        query: `subscription BoughtBananas {
          boughtBananas {
            name
          }
        }`,
        variables: {},
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

    await wait(5);

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

    await wait(5);

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

    await wait(5);

    expect(nextFnForBananas).toHaveBeenCalledTimes(2);
    expect(completeFnForBananas).toBeCalled();
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
          query: `subscription BecomingHappy {
            becameHappy {
              name
            }
          }`,
          variables: {},
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

      await wait(5);

      client.subscribe(
        {
          operationName: 'BoughtBananas',
          query: `subscription BoughtBananas {
            boughtBananas {
              name
            }
          }`,
          variables: {},
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

    await wait(25);

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
    await wait(5);

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
    await wait(5);

    client.dispose();
    await wait(5);

    expect(server.webSocketServer.clients.size).toBe(0);
  });

  it('should connect on first subscribe when mode is enabled', async () => {
    const client = createClient({
      url,
      lazy: true, // default
    });
    await wait(5);

    expect(server.webSocketServer.clients.size).toBe(0);

    client.subscribe(
      {
        operationName: 'BoughtBananas',
        query: `subscription BoughtBananas {
          boughtBananas {
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
    await wait(5);

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
    await wait(5);

    const disposeClient1 = client.subscribe(
      {
        operationName: 'BoughtBananas',
        query: `subscription BoughtBananas {
          boughtBananas {
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
    await wait(5);

    const disposeClient2 = client.subscribe(
      {
        operationName: 'BecomingHappy',
        query: `subscription BecomingHappy {
          becameHappy {
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
    await wait(5);

    disposeClient1();
    await wait(5);

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
    await wait(5);

    expect(server.webSocketServer.clients.size).toBe(1);

    server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(5);

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
    await wait(5);

    expect(server.webSocketServer.clients.size).toBe(1);

    server.webSocketServer.clients.forEach((client) => {
      client.close();
    });
    await wait(5);

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
    await wait(5);

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
