/**
 * @jest-environment jsdom
 */

import WebSocket from 'ws';
import { url, startServer } from './fixtures/simple';
import { createClient } from '../client';

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
