# GraphQL 🧩 WebSocket

> 🔗 A coherent, zero-dependency, lazy, simple and easy to use server and client implementation of the [GraphQL over WebSocket Protocol](PROTOCOL.md).

## Getting started

### Install

```shell
yarn add @enisdenjo/graphql-transport-ws
# or
npm install @enisdenjo/graphql-transport-ws
```

### Examples

#### Client usage with [Relay](https://relay.dev)

```ts
import { createClient } from '@enisdenjo/graphql-transport-ws';
import { Network, Observable } from 'relay-runtime';

const subscriptionsClient = createClient({
  url: 'wss://some.url/graphql',
  connectionParams: () => {
    const session = getSession();
    if (!session) {
      return null;
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
        sink,
      );
    });
  },
);
```

#### Client usage with [Apollo](https://www.apollographql.com)

```typescript
import { print } from 'graphql';
import { ApolloLink, Operation, FetchResult, Observable } from '@apollo/client';
import { createClient, Config, Client } from '@enisdenjo/graphql-transport-ws';

class WebSocketLink extends ApolloLink {
  private client: Client;

  constructor(config: Config) {
    super();
    this.client = createClient(config);
  }

  public request({
    operationName,
    query,
    variables,
  }: Operation): Observable<FetchResult> {
    return new Observable((sink) => {
      return this.client.subscribe<FetchResult>(
        { operationName, query: print(query), variables },
        sink,
      );
    });
  }
}

const link = new WebSocketLink({
  url: 'wss://some.url/graphql',
  connectionParams: () => {
    const session = getSession();
    if (!session) {
      return null;
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

Read about the exact transport protocol used by the library in the [PROTOCOL.md](PROTOCOL.md) document.

## Want to help?

File a bug, contribute with code, or improve documentation? Welcome 👋!
Read up on our guidelines for [contributing](CONTRIBUTING.md).
