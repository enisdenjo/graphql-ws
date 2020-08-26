/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { url, startServer, pubsub } from './fixtures/simple';
import { createClient } from '../client';

/** Waits for the specified timeout and then resolves the promise. */
const wait = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

Object.assign(global, {
  WebSocket: WebSocket,
});

let dispose: (() => Promise<void>) | undefined;
beforeAll(async () => {
  [, dispose] = await startServer();
});
afterAll(async () => {
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
    await wait(5);

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
    await wait(5);

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
