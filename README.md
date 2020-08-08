# graphql-transport-ws

**Work in progress!**

A client for GraphQL subscriptions over WebSocket. _Server implementation coming soon!_

## Getting started

### Install

```shell
yarn add @enisdenjo/graphql-transport-ws
# or
npm install @enisdenjo/graphql-transport-ws
```

### Usage

#### With [Relay](https://relay.dev)

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

#### With [Apollo](https://www.apollographql.com)

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
      return this.client.subscribe(
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

## Protocol

Read more about it in the [PROTOCOL.md](PROTOCOL.md)

## Want to help?

Want to file a bug, contribute some code, or improve documentation? Excellent! Read up on our
guidelines for [contributing](CONTRIBUTING.md).
