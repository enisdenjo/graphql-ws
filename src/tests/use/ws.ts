import { createTClient } from '../server';
import { MessageType, stringifyMessage } from '../../message';
import { startTServer } from '../fixtures/simple';

describe('Keep-Alive', () => {
  it('should dispatch pings after the timeout has passed', async (done) => {
    const { url } = await startTServer(undefined, 50);

    const client = await createTClient(url);
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    client.ws.once('ping', () => done());
  });

  it('should not dispatch pings if disabled with nullish timeout', async (done) => {
    const { url } = await startTServer(undefined, 0);

    const client = await createTClient(url);
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    client.ws.once('ping', () => fail('Shouldnt have pinged'));

    setTimeout(done, 50);
  });

  it('should terminate the socket if no pong is sent in response to a ping', async () => {
    const { url } = await startTServer(undefined, 50);

    const client = await createTClient(url);
    client.ws.send(
      stringifyMessage<MessageType.ConnectionInit>({
        type: MessageType.ConnectionInit,
      }),
    );

    // disable pong
    client.ws.pong = () => {
      /**/
    };

    // ping is received
    await new Promise((resolve) => client.ws.once('ping', resolve));

    // termination is not graceful or clean
    await client.waitForClose((event) => {
      expect(event.code).toBe(1006);
      expect(event.wasClean).toBeFalsy();
    });
  });
});
