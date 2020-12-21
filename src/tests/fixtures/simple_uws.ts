import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  execute,
  subscribe,
  GraphQLNonNull,
} from 'graphql';
import uws from 'uWebSockets.js';
import getPort from 'get-port';
import { ServerOptions } from '../../server';
import { useServer, Extra } from '../../use/uws';

// distinct server for each test; if you forget to dispose, the fixture wont
const leftovers: Dispose[] = [];
afterEach(async () => {
  while (leftovers.length > 0) {
    // if not disposed by test, cleanup
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dispose = leftovers.pop()!;
    await dispose();
  }
});

export interface TServer {
  url: string;
  dispose: Dispose;
}

type Dispose = (beNice?: boolean) => void;

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      getValue: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: () => 'value',
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      greetings: {
        type: new GraphQLNonNull(GraphQLString),
        subscribe: async function* () {
          for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
            yield { greetings: hi };
          }
        },
      },
    },
  }),
});

export async function startTServer(
  options: Partial<ServerOptions<Extra>> = {},
  keepAlive?: number, // for ws tests sake
): Promise<TServer> {
  const path = '/simple';
  const port = await getPort();
  const app = uws.App();

  const server = useServer(
    {
      schema,
      execute,
      subscribe,
      ...options,
      onConnect: async (...args) => {
        const permitted = await options?.onConnect?.(...args);
        return permitted;
      },
      onOperation: async (ctx, msg, args, result) => {
        const maybeResult = await options?.onOperation?.(
          ctx,
          msg,
          args,
          result,
        );
        return maybeResult;
      },
      onComplete: async (...args) => {
        await options?.onComplete?.(...args);
      },
    },
    {
      app,
      path,
    },
    keepAlive,
  );

  const socket = await new Promise<uws.us_listen_socket>((resolve, reject) => {
    app.listen(port, (socket: uws.us_listen_socket) => {
      if (socket) {
        resolve(socket);
      } else {
        reject('There is no UWS socket');
      }
    });
  });

  const dispose: Dispose = () => {
    server.dispose();
    uws.us_listen_socket_close(socket);
    leftovers.splice(leftovers.indexOf(dispose), 1);
  };

  leftovers.push(dispose);

  return {
    url: `ws://localhost:${port}${path}`,
    dispose,
  };
}
