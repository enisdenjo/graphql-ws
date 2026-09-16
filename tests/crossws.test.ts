import { once } from 'node:events';
import http from 'node:http';
import crossws from 'crossws/adapters/node';
import { describe, expect, it, onTestFinished } from 'vitest';
import WebSocket from 'ws';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../src/common';
import { makeHooks } from '../src/use/crossws';

describe('crossws upgrade', () => {
  it('should leave protocol negotiation to legacy adapters with partial requests', async () => {
    const hooks = makeHooks({});
    const request = {
      url: 'http://localhost/graphql',
      headers: new Headers({
        'Sec-WebSocket-Protocol': GRAPHQL_TRANSPORT_WS_PROTOCOL,
      }),
      context: {},
    } as Request & { context: Record<string, unknown> };

    expect(await hooks.upgrade?.(request)).toBeUndefined();
  });

  it.each([
    GRAPHQL_TRANSPORT_WS_PROTOCOL,
    `other, ${GRAPHQL_TRANSPORT_WS_PROTOCOL}`,
    `${GRAPHQL_TRANSPORT_WS_PROTOCOL}, other`,
    `other,  ${GRAPHQL_TRANSPORT_WS_PROTOCOL}  , another`,
  ])('should select the GraphQL subprotocol from %s', async (protocols) => {
    const hooks = makeHooks({});
    const request = new Request('http://localhost/graphql', {
      headers: { 'Sec-WebSocket-Protocol': protocols },
    });

    const result = await hooks.upgrade?.(
      Object.assign(request, { context: {} }),
    );

    expect(result).toEqual({
      headers: { 'Sec-WebSocket-Protocol': GRAPHQL_TRANSPORT_WS_PROTOCOL },
    });
  });

  it.each([
    undefined,
    '',
    'graphql-ws',
    'other, another',
    `${GRAPHQL_TRANSPORT_WS_PROTOCOL}gibberish`,
    GRAPHQL_TRANSPORT_WS_PROTOCOL.toUpperCase(),
  ])(
    'should not select an unsupported subprotocol from %s',
    async (protocols) => {
      const hooks = makeHooks({});
      const request = new Request('http://localhost/graphql', {
        headers:
          protocols === undefined
            ? {}
            : { 'Sec-WebSocket-Protocol': protocols },
      });

      expect(
        await hooks.upgrade?.(Object.assign(request, { context: {} })),
      ).toBeUndefined();
    },
  );
});

describe('crossws Node adapter', () => {
  it.each(
    [
      [GRAPHQL_TRANSPORT_WS_PROTOCOL],
      [GRAPHQL_TRANSPORT_WS_PROTOCOL, 'other'],
    ].map((protocols) => ({ protocols })),
  )(
    'should negotiate a single subprotocol for $protocols',
    async ({ protocols }) => {
      const adapter = crossws({ hooks: makeHooks({}) });
      const server = http.createServer();
      server.on('upgrade', adapter.handleUpgrade);
      onTestFinished(async () => {
        adapter.closeAll(1000, '', true);
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected a TCP server address');
      }

      const client = new WebSocket(`ws://127.0.0.1:${address.port}`, protocols);
      const [[response]] = await Promise.all([
        once(client, 'upgrade'),
        once(client, 'open'),
      ]);

      expect(client.protocol).toBe(GRAPHQL_TRANSPORT_WS_PROTOCOL);
      expect(
        (response as http.IncomingMessage).rawHeaders.filter(
          (header, index) =>
            index % 2 === 0 &&
            header.toLowerCase() === 'sec-websocket-protocol',
        ),
      ).toHaveLength(1);
    },
  );
});
