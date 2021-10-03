import uWS from 'uWebSockets.js'; // yarn add uWebSockets.js@uNetworking/uWebSockets.js#<tag>
import { ports } from './ports.mjs';
import { makeBehavior } from '../../lib/use/uWebSockets.mjs';
import { schema } from './schema.mjs';

uWS
  .App()
  .ws('/graphql', makeBehavior({ schema }))
  .listen(ports.uws, (listenSocket) => {
    if (listenSocket) {
      console.log(`uWebSockets - listening on port ${ports.uWebSockets}...`);
    }
  });
