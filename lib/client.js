"use strict";
/**
 *
 * GraphQL over WebSocket Protocol
 *
 * Check out the `PROTOCOL.md` document for the transport specification.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const protocol_1 = require("./protocol");
const message_1 = require("./message");
const utils_1 = require("./utils");
/** Creates a disposable GQL subscriptions client. */
function createClient(options) {
    const { url, connectionParams } = options;
    // holds all currently subscribed sinks, will use this map
    // to dispatch messages to the correct destination
    const subscribedSinks = {};
    function errorAllSinks(err) {
        Object.entries(subscribedSinks).forEach(([, sink]) => sink.error(err));
    }
    function completeAllSinks() {
        Object.entries(subscribedSinks).forEach(([, sink]) => sink.complete());
    }
    // Lazily uses the socket singleton to establishes a connection described by the protocol.
    let socket = null, connected = false, connecting = false;
    async function connect() {
        if (connected) {
            return;
        }
        if (connecting) {
            let waitedTimes = 0;
            while (!connected) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                // 100ms * 50 = 5sec
                if (waitedTimes >= 50) {
                    throw new Error('Waited 10 seconds but socket never connected');
                }
                waitedTimes++;
            }
            // connected === true
            return;
        }
        connected = false;
        connecting = true;
        return new Promise((resolve, reject) => {
            let done = false; // used to avoid resolving/rejecting the promise multiple times
            socket = new WebSocket(url, protocol_1.GRAPHQL_TRANSPORT_WS_PROTOCOL);
            /**
             * `onerror` handler is unnecessary because even if an error occurs, the `onclose` handler will be called
             *
             * From: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
             * > If an error occurs while attempting to connect, first a simple event with the name error is sent to the
             * > WebSocket object (thereby invoking its onerror handler), and then the CloseEvent is sent to the WebSocket
             * > object (thereby invoking its onclose handler) to indicate the reason for the connection's closing.
             */
            socket.onclose = ({ code, reason }) => {
                const err = new Error(`Socket closed with event ${code}` + !reason ? '' : `: ${reason}`);
                if (code === 1000 || code === 1001) {
                    // close event `1000: Normal Closure` is ok and so is `1001: Going Away` (maybe the server is restarting)
                    completeAllSinks();
                }
                else {
                    // all other close events are considered erroneous
                    errorAllSinks(err);
                }
                if (!done) {
                    done = true;
                    connecting = false;
                    connected = false; // the connection is lost
                    socket = null;
                    reject(err); // we reject here bacause the close is not supposed to be called during the connect phase
                }
            };
            socket.onopen = () => {
                try {
                    if (!socket) {
                        throw new Error('Opened a socket on nothing');
                    }
                    socket.send(message_1.stringifyMessage({
                        type: message_1.MessageType.ConnectionInit,
                        payload: typeof connectionParams === 'function'
                            ? connectionParams()
                            : connectionParams,
                    }));
                }
                catch (err) {
                    errorAllSinks(err);
                    if (!done) {
                        done = true;
                        connecting = false;
                        if (socket) {
                            socket.close();
                            socket = null;
                        }
                        reject(err);
                    }
                }
            };
            function handleMessage({ data }) {
                try {
                    if (!socket) {
                        throw new Error('Received a message on nothing');
                    }
                    const message = message_1.parseMessage(data);
                    if (message.type !== message_1.MessageType.ConnectionAck) {
                        throw new Error(`First message cannot be of type ${message.type}`);
                    }
                    // message.type === MessageType.ConnectionAck
                    if (!done) {
                        done = true;
                        connecting = false;
                        connected = true; // only now is the connection ready
                        resolve();
                    }
                }
                catch (err) {
                    errorAllSinks(err);
                    if (!done) {
                        done = true;
                        connecting = false;
                        if (socket) {
                            socket.close();
                            socket = null;
                        }
                        reject(err);
                    }
                }
                finally {
                    if (socket) {
                        // this listener is not necessary anymore
                        socket.removeEventListener('message', handleMessage);
                    }
                }
            }
            socket.addEventListener('message', handleMessage);
        });
    }
    return {
        subscribe: (payload, sink) => {
            const uuid = generateUUID();
            if (subscribedSinks[uuid]) {
                sink.error(new Error(`Sink with ID ${uuid} already registered`));
                return utils_1.noop;
            }
            subscribedSinks[uuid] = sink;
            function handleMessage({ data }) {
                const message = message_1.parseMessage(data);
                switch (message.type) {
                    case message_1.MessageType.Next: {
                        if (message.id === uuid) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            sink.next(message.payload);
                        }
                        break;
                    }
                    case message_1.MessageType.Error: {
                        if (message.id === uuid) {
                            sink.error(message.payload);
                        }
                        break;
                    }
                    case message_1.MessageType.Complete: {
                        if (message.id === uuid) {
                            sink.complete();
                        }
                        break;
                    }
                }
            }
            (async () => {
                try {
                    await connect();
                    if (!socket) {
                        throw new Error('Socket connected but empty');
                    }
                    socket.addEventListener('message', handleMessage);
                    socket.send(message_1.stringifyMessage({
                        id: uuid,
                        type: message_1.MessageType.Subscribe,
                        payload,
                    }));
                }
                catch (err) {
                    sink.error(err);
                }
            })();
            return () => {
                if (socket) {
                    socket.send(message_1.stringifyMessage({
                        id: uuid,
                        type: message_1.MessageType.Complete,
                    }));
                    socket.removeEventListener('message', handleMessage);
                    // equal to 1 because this sink is the last one.
                    // the deletion from the map happens afterwards
                    if (Object.entries(subscribedSinks).length === 1) {
                        socket.close(1000, 'Normal Closure');
                        socket = null;
                    }
                }
                sink.complete();
                delete subscribedSinks[uuid];
            };
        },
        dispose: async () => {
            // complete all sinks
            // TODO-db-200817 complete or error? the sinks should be completed BEFORE the client gets disposed
            completeAllSinks();
            // delete all sinks
            Object.keys(subscribedSinks).forEach((uuid) => {
                delete subscribedSinks[uuid];
            });
            // if there is an active socket, close it with a normal closure
            if (socket && socket.readyState === WebSocket.OPEN) {
                // TODO-db-200817 decide if `1001: Going Away` should be used instead
                socket.close(1000, 'Normal Closure');
                socket = null;
            }
        },
    };
}
exports.createClient = createClient;
/** Generates a new v4 UUID. Reference: https://stackoverflow.com/a/2117523/709884 */
function generateUUID() {
    if (!window.crypto) {
        // fallback to Math.random when crypto is not available
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (s) => {
        const c = Number.parseInt(s, 10);
        return (c ^
            (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16);
    });
}
