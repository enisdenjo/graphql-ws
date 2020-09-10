<div align="center">
  <br />

  <h3>🚡 GraphQL transport over WebSocket</h3>
  <h6>Coherent, zero-dependency, lazy, simple, <a href="PROTOCOL.md">GraphQL over WebSocket Protocol</a> compliant server and client</h6>

[![Continuous integration](https://github.com/enisdenjo/graphql-transport-ws/workflows/Continuous%20integration/badge.svg)](https://github.com/enisdenjo/graphql-transport-ws/actions?query=workflow%3A%22Continuous+integration%22) [![graphql-transport-ws](https://img.shields.io/npm/v/graphql-transport-ws.svg?label=graphql-transport-ws&logo=npm)](https://www.npmjs.com/package/graphql-transport-ws)

  <br />
</div>

## Getting started

#### Install

```shell
$ yarn add graphql-transport-ws
```

#### Create a GraphQL schema

```ts
import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type Query {
    hello: String
  }
  type Subscription {
    greetings: String
  }
`);

// The roots provide operation resolver functions for each API endpoint
const roots = {
  query: {
    hello: () => 'Hello World!',
  },
  subscription: {
    greetings: async function* sayHiIn5Languages() {
      for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
        yield { greetings: hi };
      }
    },
  },
};
```

#### Start the server

```ts
import http from 'http';
import { execute, subscribe } from 'graphql';
import { createServer } from 'graphql-transport-ws';

const server = http.createServer(function weServeSocketsOnly(_, res) {
  res.writeHead(404);
  res.end();
});

createServer(
  {
    schema, // from the previous step
    roots, // from the previous step
    execute,
    subscribe,
  },
  {
    server,
    path: '/graphql',
  },
);

server.listen(80);
```

#### Use the client

```ts
import { createClient } from '../client';

const client = createClient({
  url: 'ws://welcomer.com/graphql',
});

// query
(async () => {
  const result = await new Promise((resolve, reject) => {
    let result;
    client.subscribe(
      {
        query: '{ hello }',
      },
      {
        next: (data) => (result = data),
        error: reject,
        complete: () => resolve(result),
      },
    );
  });

  expect(result).toEqual({ hello: 'Hello World!' });
})();

// subscription
(async () => {
  const onNext = () => {
    /**/
  };

  await new Promise((resolve, reject) => {
    client.subscribe(
      {
        query: 'subscription { greetings }',
      },
      {
        next: onNext,
        error: reject,
        complete: () => resolve(),
      },
    );
  });

  expect(onNext).toBeCalledTimes(5); // we say "Hi" in 5 languages
})();
```

## Recepies

<details>
<summary>Promisify query execution</summary>

```ts
import { createClient, SubscribePayload } from '../index';

const client = createClient({
  url: 'wss://hey.there/graphql',
});

async function execute<T>(payload: SubscribePayload) {
  return new Promise((resolve, reject) => {
    let result: T;
    client.subscribe<T>(payload, {
      next: (data) => (result = data),
      error: reject,
      complete: () => resolve(result),
    });
  });
}

// use
(async () => {
  try {
    const result = await execute({
      query: '{ hello }',
    });
    // complete
    // next = result = { data: { hello: 'Hello World!' } }
  } catch (err) {
    // error
  }
})();
```

</details>

<details>
<summary>Client usage with [Relay](https://relay.dev)</summary>

```ts
import { Network, Observable } from 'relay-runtime';
import { createClient } from 'graphql-transport-ws';

const subscriptionsClient = createClient({
  url: 'wss://i.need/graphql',
  connectionParams: () => {
    const session = getSession();
    if (!session) {
      return {};
    }
    return {
      Authorization: `Bearer ${session.token}`,
    };
  },
});

export const network = Network.create(
  // fetch
  (operation, variables, cacheConfig) => {
    return Observable.create((sink) => {
      fetchQuery(operation, variables, cacheConfig, sink);
    });
  },
  // subscribe
  (operation, variables) => {
    return Observable.create((sink) => {
      if (!operation.text) {
        return sink.error(new Error('Operation text cannot be empty'));
      }
      return subscriptionsClient.subscribe(
        {
          operationName: operation.name,
          query: operation.text,
          variables,
        },
        {
          ...sink,
          error: (err) => {
            if (err instanceof Error) {
              sink.error(err);
            } else if (err instanceof CloseEvent) {
              sink.error(
                new Error(
                  `Socket closed with event ${err.code}` + err.reason
                    ? `: ${err.reason}` // reason will be available on clean closes
                    : '',
                ),
              );
            } else {
              // GraphQLError[]
              sink.error(
                new Error(err.map(({ message }) => message).join(', ')),
              );
            }
          },
        },
      );
    });
  },
);
```

</details>

<details>
<summary>Client usage with [Apollo](https://www.apollographql.com)</summary>

```typescript
import { ApolloLink, Operation, FetchResult, Observable } from '@apollo/client';
import { createClient, Config, Client } from 'graphql-transport-ws';

class WebSocketLink extends ApolloLink {
  private client: Client;

  constructor(config: Config) {
    super();
    this.client = createClient(config);
  }

  public request(operation: Operation): Observable<FetchResult> {
    return new Observable((sink) => {
      return this.client.subscribe<FetchResult>(operation, {
        ...sink,
        error: (err) => {
          if (err instanceof Error) {
            sink.error(err);
          } else if (err instanceof CloseEvent) {
            sink.error(
              new Error(
                `Socket closed with event ${err.code}` + err.reason
                  ? `: ${err.reason}` // reason will be available on clean closes
                  : '',
              ),
            );
          } else {
            // GraphQLError[]
            sink.error(new Error(err.map(({ message }) => message).join(', ')));
          }
        },
      });
    });
  }
}

const link = new WebSocketLink({
  url: 'wss://where.is/graphql',
  connectionParams: () => {
    const session = getSession();
    if (!session) {
      return {};
    }
    return {
      Authorization: `Bearer ${session.token}`,
    };
  },
});
```

</details>

## [Documentation](docs/)

Check the [docs folder](docs/) out for [TypeDoc](https://typedoc.org) generated documentation.

## [How does it work?](PROTOCOL.md)

Read about the exact transport intricacies used by the library in the [GraphQL over WebSocket Protocol document](PROTOCOL.md).

## [Want to help?](CONTRIBUTING.md)

File a bug, contribute with code, or improve documentation? Read up on our guidelines for [contributing](CONTRIBUTING.md) and `yarn test --watch` away!.
