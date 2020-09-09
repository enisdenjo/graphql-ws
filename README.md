<div align="center">
  <br />

  <h3>🚡 GraphQL transport over WebSocket</h3>
  <h6>Coherent, zero-dependency, lazy, simple, <a href="PROTOCOL.md">GraphQL over WebSocket Protocol</a> compliant server and client</h6>

[![Continuous integration](https://github.com/enisdenjo/graphql-transport-ws/workflows/Continuous%20integration/badge.svg)](https://github.com/enisdenjo/graphql-transport-ws/actions?query=workflow%3A%22Continuous+integration%22) [![graphql-transport-ws](https://img.shields.io/npm/v/graphql-transport-ws.svg?label=graphql-transport-ws&logo=npm)](https://www.npmjs.com/package/graphql-transport-ws)

  <br />
</div>

## Getting started

### Install

```shell
yarn add graphql-transport-ws
# or
npm install graphql-transport-ws
```

### Examples

#### Client usage with [Relay](https://relay.dev)

```ts
import { Network, Observable } from 'relay-runtime';
import { createClient } from 'graphql-transport-ws';

const subscriptionsClient = createClient({
  url: 'wss://some.url/graphql',
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

#### Client usage with [Apollo](https://www.apollographql.com)

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
  url: 'wss://some.url/graphql',
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

## Documentation

[TypeDoc](https://typedoc.org) generated documentation is located in the [docs folder](docs/).

## Protocol

Read about the exact transport protocol used by the library in the [Protocol document](PROTOCOL.md).

## Want to help?

File a bug, contribute with code, or improve documentation? Welcome 👋!
Read up on our guidelines for [contributing](CONTRIBUTING.md).
