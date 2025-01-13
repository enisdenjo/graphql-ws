import { expect, it } from 'vitest';
import { MessageType, validateMessage } from '../src/common';

it.each([
  // straight up invalid
  {},
  '',
  [],
  0,
  9,
  Symbol,
  Object,
  () => {
    /**/
  },

  // invalid 'type' prop
  {
    type: '',
  },
  {
    type: undefined,
  },
  {
    type: 0,
  },
  {
    type: 'nuxt',
  },

  // invalid connection_init, connection_ack, ping and pong message
  {
    type: MessageType.ConnectionInit,
    payload: '',
  },
  {
    type: MessageType.ConnectionInit,
    payload: 0,
  },
  {
    type: MessageType.ConnectionAck,
    payload: '',
  },
  {
    type: MessageType.Ping,
    payload: 0,
  },

  // invalid subscribe message
  {
    type: MessageType.Subscribe,
  },
  {
    id: 0,
    type: MessageType.Subscribe,
  },
  {
    id: '',
    type: MessageType.Subscribe,
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: [],
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: '',
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {},
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      query: 0,
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      query: {},
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      operationName: 0,
      query: '',
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      operationName: {},
      query: '',
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      query: '',
      variables: '',
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      query: '',
      extensions: '',
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      query: '',
      extensions: 0,
    },
  },

  // invalid next message
  {
    type: MessageType.Next,
  },
  {
    id: undefined,
    type: MessageType.Next,
  },
  {
    id: '',
    type: MessageType.Next,
  },
  {
    id: 'id',
    type: MessageType.Next,
  },
  {
    id: 'id',
    type: MessageType.Next,
    payload: '',
  },

  // invalid error message
  {
    type: MessageType.Error,
  },
  {
    id: '',
    type: MessageType.Error,
  },
  {
    id: 'id',
    type: MessageType.Error,
  },
  {
    id: 'id',
    type: MessageType.Error,
    payload: {},
  },
  {
    id: 'id',
    type: MessageType.Error,
    payload: '',
  },
  {
    id: 'id',
    type: MessageType.Error,
    payload: [],
  },
  {
    id: 'id',
    type: MessageType.Error,
    payload: [{ iam: 'invalid' }],
  },

  // invalid complete message
  {
    type: MessageType.Complete,
  },
  {
    id: '',
    type: MessageType.Complete,
  },
  {
    id: 0,
    type: MessageType.Complete,
  },
])('should report invalid message %j with descriptive error', (invalid) => {
  expect(() => validateMessage(invalid)).toThrowErrorMatchingSnapshot();
});

it.each([
  // valid connection_init, connection_ack, ping and pong message
  {
    type: MessageType.ConnectionInit,
  },
  {
    type: MessageType.ConnectionInit,
    payload: {},
  },
  {
    type: MessageType.ConnectionInit,
    payload: null,
  },
  {
    type: MessageType.ConnectionAck,
  },
  {
    type: MessageType.ConnectionAck,
    payload: {},
  },
  {
    type: MessageType.ConnectionAck,
    payload: null,
  },
  {
    type: MessageType.Ping,
  },
  {
    type: MessageType.Ping,
    payload: {},
  },
  {
    type: MessageType.Ping,
    payload: null,
  },
  {
    type: MessageType.Pong,
  },
  {
    type: MessageType.Pong,
    payload: {},
  },
  {
    type: MessageType.Pong,
    payload: null,
  },

  // valid subscribe message
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      query: '',
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      operationName: undefined,
      variables: undefined,
      extensions: undefined,
      query: '',
    },
  },
  {
    id: 'id',
    type: MessageType.Subscribe,
    payload: {
      operationName: null,
      variables: null,
      extensions: null,
      query: '',
    },
  },

  // valid error message
  {
    id: 'id',
    type: MessageType.Error,
    payload: [{ message: 'I am Error' }],
  },

  // valid complete message
  {
    id: 'id',
    type: MessageType.Complete,
  },
])('should accept valid message %j', (valid) => {
  expect(() => validateMessage(valid)).not.toThrow();
});
