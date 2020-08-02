import http from 'http';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  subscribe,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { Disposable } from '../types';
import { createServer } from '../server';
import { GRAPHQL_WS_PROTOCOL } from '../protocol';

import WebSocket from 'ws';
Object.assign(global, {
  WebSocket: WebSocket, // for the client
});

const pubsub = new PubSub();

const personType = new GraphQLObjectType({
  name: 'Person',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      testString: { type: GraphQLString, resolve: () => 'value' },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      person: {
        type: personType,
        args: {
          id: { type: GraphQLString },
        },
        subscribe: () => {
          return pubsub.asyncIterator('person');
        },
      },
    },
  }),
});

const port = 8273;
const path = '/graphql';
const url = `ws://localhost:${port}${path}`;

let server: Disposable, httpServer: http.Server;
beforeAll((done) => {
  httpServer = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  server = createServer(
    {
      schema,
      subscribe,
    },
    {
      server: httpServer,
      path,
    },
  );
  httpServer.listen(port, done);
});
afterAll((done) => {
  server.dispose().then(() => {
    httpServer.close(done);
  });
});

it('should allow connections with valid protocols only', (done) => {
  expect.assertions(4);

  let client = new WebSocket(url);
  client.onclose = (event) => {
    expect(event.code).toBe(1002); // 1002: Protocol error
  };

  client = new WebSocket(url, ['graphql', 'json']);
  client.onclose = (event) => {
    expect(event.code).toBe(1002); // 1002: Protocol error
  };

  client = new WebSocket(url, GRAPHQL_WS_PROTOCOL + 'gibberish');
  client.onclose = (event) => {
    expect(event.code).toBe(1002); // 1002: Protocol error
  };

  client = new WebSocket(url, GRAPHQL_WS_PROTOCOL);
  const closeFn = jest.fn();
  client.onclose = closeFn;
  setTimeout(() => {
    expect(closeFn).not.toBeCalled();
    done();
  }, 50);
});
