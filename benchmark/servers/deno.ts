// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck TODO: figure out how to use deno types

import { serve } from 'https://deno.land/std/http/mod.ts';
import {
  makeHandler,
  GRAPHQL_TRANSPORT_WS_PROTOCOL,
} from '../../lib/use/deno.mjs';
import { schema } from './schema.mjs';
import { ports } from './ports.mjs';

const handler = makeHandler({ schema });

serve(
  (req: Request) => {
    if (req.headers.get('upgrade') != 'websocket') {
      return new Response('Upgrade Required', { status: 426 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req, {
      protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
      idleTimeout: 12_000,
    });
    handler(socket);
    return response;
  },
  { port: ports.deno },
);
