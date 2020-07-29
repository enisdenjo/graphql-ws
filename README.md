# graphql-subscriptions-ws

**Work in progress!**

A client for GraphQL subscriptions over WebSocket. _Server implementation coming soon!_

## Getting started

```shell
yarn add subscriptions-transport-ws
# or
npm install subscriptions-transport-ws
```

### Relay

```ts
import { createClient } from 'graphql-subscriptions-ws';
import { Network } from 'relay-runtime';

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
        sink
      );
    });
  }
);
```

## Protocol

Read more about it in the [PROTOCOL.md](PROTOCOL.md)

## Want to help?

Want to file a bug, contribute some code, or improve documentation? Excellent! Read up on our
guidelines for [contributing](CONTRIBUTING.md).
