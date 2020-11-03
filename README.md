<div align="center">
  <br />

![GraphQLOverWebSocket](https://user-images.githubusercontent.com/25294569/94527042-172dba00-023f-11eb-944b-88c0bd58a8d2.gif)

  <h6>Coherent, zero-dependency, lazy, simple, <a href="PROTOCOL.md">GraphQL over WebSocket Protocol</a> compliant server and client.</h6>

[![Continuous integration](https://github.com/enisdenjo/graphql-ws/workflows/Continuous%20integration/badge.svg)](https://github.com/enisdenjo/graphql-ws/actions?query=workflow%3A%22Continuous+integration%22) [![graphql-ws](https://img.shields.io/npm/v/graphql-ws.svg?label=graphql-ws&logo=npm)](https://www.npmjs.com/package/graphql-ws)

  <br />
</div>

## Getting started

#### Install

```shell
$ yarn add graphql-ws
```

#### Create a GraphQL schema

```ts
import { buildSchema } from 'graphql';

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type Query {
    hello: String
  }
  type Subscription {
    greetings: String
  }
`);

// The roots provide resolvers for each GraphQL operation
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
import https from 'https';
import { execute, subscribe } from 'graphql';
import { createServer } from 'graphql-ws';

const server = https.createServer(function weServeSocketsOnly(_, res) {
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

server.listen(443);
```

#### Use the client

```ts
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://welcomer.com/graphql',
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
        complete: resolve,
      },
    );
  });

  expect(onNext).toBeCalledTimes(5); // we say "Hi" in 5 languages
})();
```

## Recipes

<details>
<summary>Client usage with Promise</summary>

```ts
import { createClient, SubscribePayload } from 'graphql-ws';

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
<summary>Client usage with <a href="https://github.com/tc39/proposal-observable">Observable</a></summary>

```ts
import { Observable } from 'relay-runtime';
// or
import { Observable } from '@apollo/client';
// or
import { Observable } from 'rxjs';
// or
import Observable from 'zen-observable';
// or any other lib which implements Observables as per the ECMAScript proposal: https://github.com/tc39/proposal-observable

const client = createClient({
  url: 'wss://graphql.loves/observables',
});

function toObservable(operation) {
  return new Observable((observer) => client.subscribe(operation, observer));
}

const observable = toObservable({ query: `subscription { ping }` });

const subscription = observable.subscribe({
  next: (data) => {
    expect(data).toBe({ data: { ping: 'pong' } });
  },
});

// ⏱

subscription.unsubscribe();
```

</details>

<details>
<summary>Client usage with <a href="https://relay.dev">Relay</a></summary>

```ts
import {
  Network,
  Observable,
  RequestParameters,
  Variables,
} from 'relay-runtime';
import { createClient } from 'graphql-ws';

const subscriptionsClient = createClient({
  url: 'wss://i.love/graphql',
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

// yes, both fetch AND subscribe handled in one implementation
function fetchOrSubscribe(operation: RequestParameters, variables: Variables) {
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
            sink.error(new Error(err.map(({ message }) => message).join(', ')));
          }
        },
      },
    );
  });
}

export const network = Network.create(fetchOrSubscribe, fetchOrSubscribe);
```

</details>

<details>
<summary>Client usage with <a href="https://www.apollographql.com">Apollo</a></summary>

```typescript
import { ApolloLink, Operation, FetchResult, Observable } from '@apollo/client';
import { createClient, Config, Client } from 'graphql-ws';

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

<details>
<summary>Client usage in Node</summary>

```ts
const WebSocket = require('ws'); // yarn add ws
const Crypto = require('crypto');
const { createClient } = require('graphql-ws');

const client = createClient({
  url: 'wss://no.browser/graphql',
  webSocketImpl: WebSocket,
  /**
   * Generates a v4 UUID to be used as the ID.
   * Reference: https://stackoverflow.com/a/2117523/709884
   */
  generateID: () =>
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (c ^ (Crypto.randomBytes(1)[0] & (15 >> (c / 4)))).toString(16),
    ),
});

// consider other recipes for usage inspiration
```

</details>

<details>
<summary>Server usage with <a href="https://github.com/graphql/express-graphql">Express GraphQL</a></summary>

```typescript
import https from 'https';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { createServer } from 'graphql-ws';
import { execute, subscribe } from 'graphql';
import { schema } from 'my-graphql-schema';

// create express and middleware
const app = express();
app.use('/graphql', graphqlHTTP({ schema }));

// create a http server using express
const server = https.createServer(app);

server.listen(443, () => {
  createServer(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server,
      path: '/graphql', // you can use the same path too, just use the `ws` schema
    },
  );
});
```

</details>

<details>
<summary>Server usage with console logging</summary>

```typescript
import https from 'https';
import { execute, subscribe } from 'graphql';
import { createServer } from 'graphql-ws';
import { schema } from 'my-graphql-schema';

const server = https.createServer(function weServeSocketsOnly(_, res) {
  res.writeHead(404);
  res.end();
});

createServer(
  {
    schema,
    onConnect: (ctx) => {
      console.log('Connect', ctx);
    },
    onSubscribe: (ctx, msg) => {
      console.log('Subscribe', { ctx, msg });
    },
    onNext: (ctx, msg, args, result) => {
      console.debug('Next', { ctx, msg, args, result });
    },
    onError: (ctx, msg, errors) => {
      console.error('Error', { ctx, msg, errors });
    },
    onComplete: (ctx, msg) => {
      console.log('Complete', { ctx, msg });
    },
  },
  {
    server,
    path: '/graphql',
  },
);

server.listen(443);
```

</details>

<details>
<summary>Server usage on a multi WebSocket server</summary>

```typescript
import https from 'https';
import WebSocket from 'ws';
import url from 'url';
import { execute, subscribe } from 'graphql';
import { createServer, createClient } from 'graphql-ws';
import { schema } from 'my-graphql-schema';

const server = https.createServer(function weServeSocketsOnly(_, res) {
  res.writeHead(404);
  res.end();
});

/**
 * Two websocket servers on different paths:
 * - `/wave` sends out waves
 * - `/graphql` serves graphql
 */
const waveWS = new WebSocket.Server({ noServer: true });
const graphqlWS = new WebSocket.Server({ noServer: true });

// delegate upgrade requests to relevant destinations
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/wave') {
    waveWS.handleUpgrade(request, socket, head, (client) => {
      waveWS.emit('connection', client, request);
    });
  } else if (pathname === '/graphql') {
    graphqlWS.handleUpgrade(request, socket, head, (client) => {
      graphqlWS.emit('connection', client, request);
    });
  } else {
    socket.destroy();
  }
});

// wave on connect
waveWS.on('connection', (socket) => {
  socket.send('🌊');
});

// serve graphql
createServer(
  {
    schema,
    execute,
    subscribe,
  },
  graphqlWS,
);

server.listen(443);
```

</details>

<details>
<summary>Server usage with custom context value</summary>

```typescript
import { validate, execute, subscribe } from 'graphql';
import { createServer } from 'graphql-ws';
import { schema, roots, getDynamicContext } from 'my-graphql';

createServer(
  {
    context: (ctx, msg, args) => {
      return getDynamicContext(ctx, msg, args);
    }, // or static context by supplying the value direcly
    schema,
    roots,
    execute,
    subscribe,
  },
  {
    server,
    path: '/graphql',
  },
);
```

</details>

<details>
<summary>Server usage with custom execution arguments and validation</summary>

```typescript
import { parse, validate, execute, subscribe } from 'graphql';
import { createServer } from 'graphql-ws';
import { schema, myValidationRules } from 'my-graphql';

createServer(
  {
    execute,
    subscribe,
    onSubscribe: (ctx, msg) => {
      const args = {
        schema,
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
      };

      // dont forget to validate when returning custom execution args!
      const errors = validate(args.schema, args.document, myValidationRules);
      if (errors.length > 0) {
        return errors; // return `GraphQLError[]` to send `ErrorMessage` and stop subscription
      }

      return args;
    },
  },
  {
    server,
    path: '/graphql',
  },
);
```

</details>

<details>
<summary>Server and client usage with persisted queries</summary>

```typescript
// 🛸 server

import { parse, execute, subscribe } from 'graphql';
import { createServer } from 'graphql-ws';
import { schema } from 'my-graphql-schema';

// a unique GraphQL execution ID used for representing
// a query in the persisted queries store. when subscribing
// you should use the `SubscriptionPayload.query` to transmit the id
type QueryID = string;

const queriesStore: Record<QueryID, ExecutionArgs> = {
  iWantTheGreetings: {
    schema, // you may even provide different schemas in the queries store
    document: parse('subscription Greetings { greetings }'),
  },
};

createServer(
  {
    execute,
    subscribe,
    onSubscribe: (_ctx, msg) => {
      const query = queriesStore[msg.payload.query];
      if (!query) {
        // for extra security you only allow the queries from the store
        throw new Error('404: Query Not Found');
      }
      return {
        ...query,
        variableValues: msg.payload.variables, // use the variables from the client
      };
    },
  },
  {
    server,
    path: '/graphql',
  },
);
```

```typescript
// 📺 client

import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://persisted.graphql/queries',
});

(async () => {
  const onNext = () => {
    /**/
  };

  await new Promise((resolve, reject) => {
    client.subscribe(
      {
        query: 'iWantTheGreetings',
      },
      {
        next: onNext,
        error: reject,
        complete: resolve,
      },
    );
  });

  expect(onNext).toBeCalledTimes(5); // greetings in 5 languages
})();
```

</details>

## [Documentation](docs/)

Check the [docs folder](docs/) out for [TypeDoc](https://typedoc.org) generated documentation.

## [How does it work?](PROTOCOL.md)

Read about the exact transport intricacies used by the library in the [GraphQL over WebSocket Protocol document](PROTOCOL.md).

## [Want to help?](CONTRIBUTING.md)

File a bug, contribute with code, or improve documentation? Read up on our guidelines for [contributing](CONTRIBUTING.md) and drive development with `yarn test --watch` away!
