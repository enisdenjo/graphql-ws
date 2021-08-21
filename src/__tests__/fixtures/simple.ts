import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLSchemaConfig,
} from 'graphql';

// use for dispatching a `pong` to the `ping` subscription
const pendingPongs: Record<string, number | undefined> = {};
const pongListeners: Record<string, ((done: boolean) => void) | undefined> = {};
export function pong(key = 'global'): void {
  if (pongListeners[key]) {
    pongListeners[key]?.(false);
  } else {
    const pending = pendingPongs[key];
    pendingPongs[key] = pending ? pending + 1 : 1;
  }
}

export const schemaConfig: GraphQLSchemaConfig = {
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
      ping: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          key: {
            type: GraphQLString,
          },
        },
        subscribe: function (_src, args) {
          const key = args.key ? args.key : 'global';
          return {
            [Symbol.asyncIterator]() {
              return this;
            },
            async next() {
              if ((pendingPongs[key] ?? 0) > 0) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                pendingPongs[key]!--;
                return { value: { ping: 'pong' } };
              }
              if (
                await new Promise((resolve) => (pongListeners[key] = resolve))
              )
                return { done: true };
              return { value: { ping: 'pong' } };
            },
            async return() {
              pongListeners[key]?.(true);
              delete pongListeners[key];
              return { done: true };
            },
            async throw() {
              throw new Error('Ping no gusta');
            },
          };
        },
      },
    },
  }),
};

export const schema = new GraphQLSchema(schemaConfig);
