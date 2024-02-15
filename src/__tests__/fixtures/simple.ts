import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLSchemaConfig,
  GraphQLString,
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
      throwingFrom: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          resolve: {
            type: GraphQLBoolean,
            defaultValue: null,
          },
        },
        subscribe: function () {
          throw new Error("shouldn't be called");
        },
        resolve: async function (_, { resolve }) {
          if (resolve) {
            throw new Error(`Kaboom!`);
          } else {
            return '1';
          }
        },
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
      lateReturn: {
        type: new GraphQLNonNull(GraphQLString),
        subscribe() {
          let completed = () => {
            // noop
          };
          return {
            [Symbol.asyncIterator]() {
              return this;
            },
            async next() {
              await new Promise<void>((resolve) => (completed = resolve));
              return { done: true };
            },
            return() {
              completed();

              // resolve return in next tick so that the generator loop breaks first
              return new Promise((resolve) =>
                setTimeout(() => resolve({ done: true }), 0),
              );
            },
          };
        },
      },
      throwing: {
        type: new GraphQLNonNull(GraphQLString),
        subscribe: async function () {
          throw new Error('Kaboom!');
        },
      },
      throwingFrom: {
        type: new GraphQLNonNull(GraphQLString),
        args: {
          beforeGenerator: {
            type: GraphQLBoolean,
            defaultValue: false,
          },
          generatorStep: {
            type: GraphQLInt,
            defaultValue: null,
          },
          resolveStep: {
            type: GraphQLInt,
            defaultValue: null,
          },
        },
        subscribe: function (_, { beforeGenerator, generatorStep }) {
          async function* generator() {
            for (let step = 1; step <= 3; step++) {
              if (step === generatorStep) {
                throw new Error(`Kaboom from generator step ${step}!`);
              } else {
                yield step;
              }
            }
          }

          if (beforeGenerator) {
            throw new Error('Kaboom from before generator!');
          }

          return generator();
        },
        resolve: async function (step, { resolveStep }) {
          if (step === resolveStep) {
            throw new Error(`Kaboom from resolve step ${step}!`);
          } else {
            return new String(step);
          }
        },
      },
    },
  }),
};

export const schema = new GraphQLSchema(schemaConfig);
