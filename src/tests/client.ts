/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { url, startServer, pubsub } from './fixtures/simple';
import { createClient } from '../client';
import { noop } from '../utils';

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

it('should execute the subscription and "next" the emitted results until disposed', async () => {
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
