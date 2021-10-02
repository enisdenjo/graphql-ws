import uWS from 'uWebSockets.js'; // yarn add uWebSockets.js@uNetworking/uWebSockets.js#<tag>
import { UWS_PORT } from './ports.mjs';
import { makeBehavior } from '../../lib/use/uWebSockets.mjs';
import { schema } from './schema.mjs';

uWS
  .App()
  .ws('/graphql', makeBehavior({ schema }))
  .listen(UWS_PORT, (listenSocket) => {
    if (listenSocket) {
      console.log(`uWebSockets - listening on port ${UWS_PORT}...`);
    }
  });
