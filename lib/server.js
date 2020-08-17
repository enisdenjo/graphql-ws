"use strict";
/**
 *
 * server
 *
 */
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const ws_1 = __importDefault(require("ws"));
const graphql_1 = require("graphql");
const protocol_1 = require("./protocol");
const message_1 = require("./message");
const utils_1 = require("./utils");
/**
 * Creates a protocol complient WebSocket GraphQL
 * subscription server. Read more about the protocol
 * in the PROTOCOL.md documentation file.
 */
function createServer(options, websocketOptionsOrServer) {
    const { schema, execute, onConnect, connectionInitWaitTimeout = 3 * 1000, // 3 seconds
    validationRules, formatExecutionResult, onSubscribe, onComplete, } = options;
    const webSocketServer = websocketOptionsOrServer instanceof ws_1.default.Server
        ? websocketOptionsOrServer
        : new ws_1.default.Server(websocketOptionsOrServer);
    function handleConnection(socket, _request) {
        if (socket.protocol === undefined ||
            socket.protocol !== protocol_1.GRAPHQL_TRANSPORT_WS_PROTOCOL ||
            (Array.isArray(socket.protocol) &&
                socket.protocol.indexOf(protocol_1.GRAPHQL_TRANSPORT_WS_PROTOCOL) === -1)) {
            // 1002: Protocol Error
            socket.close(1002, 'Protocol Error');
            return;
        }
        const ctxRef = {
            current: {
                socket,
                connectionInitReceived: false,
                acknowledged: false,
                subscriptions: {},
            },
        };
        // kick the client off (close socket) if the connection has
        // not been initialised after the specified wait timeout
        const connectionInitWait = connectionInitWaitTimeout !== Infinity &&
            setTimeout(() => {
                if (!ctxRef.current.connectionInitReceived) {
                    ctxRef.current.socket.close(4408, 'Connection initialisation timeout');
                }
            }, connectionInitWaitTimeout);
        function errorOrCloseHandler(errorOrClose) {
            if (connectionInitWait) {
                clearTimeout(connectionInitWait);
            }
            if (isErrorEvent(errorOrClose)) {
                // TODO-db-200805 leaking sensitive information by sending the error message too?
                // 1011: Internal Error
                ctxRef.current.socket.close(1011, errorOrClose.message);
            }
            Object.entries(ctxRef.current.subscriptions).forEach(([, subscription]) => {
                (subscription.return || utils_1.noop)();
            });
        }
        socket.onerror = errorOrCloseHandler;
        socket.onclose = errorOrCloseHandler;
        socket.onmessage = makeOnMessage(ctxRef.current);
    }
    webSocketServer.on('connection', handleConnection);
    webSocketServer.on('error', (err) => {
        for (const client of webSocketServer.clients) {
            // report server errors by erroring out all clients with the same error
            client.emit('error', err);
        }
    });
    // Sends through a message only if the socket is open.
    function sendMessage(ctx, message, callback) {
        return new Promise((resolve, reject) => {
            if (ctx.socket.readyState === ws_1.default.OPEN) {
                try {
                    ctx.socket.send(message_1.stringifyMessage(message), (err) => {
                        if (callback)
                            callback(err);
                        if (err) {
                            return reject(err);
                        }
                        return resolve();
                    });
                }
                catch (err) {
                    reject(err);
                }
            }
            else {
                if (callback)
                    callback();
                resolve();
            }
        });
    }
    function makeOnMessage(ctx) {
        return async function (event) {
            var e_1, _a;
            var _b;
            try {
                const message = message_1.parseMessage(event.data);
                switch (message.type) {
                    case message_1.MessageType.ConnectionInit: {
                        ctx.connectionInitReceived = true;
                        if (utils_1.isObject(message.payload)) {
                            ctx.connectionParams = message.payload;
                        }
                        if (onConnect) {
                            const permitted = await onConnect(ctx);
                            if (!permitted) {
                                return ctx.socket.close(4403, 'Forbidden');
                            }
                        }
                        await sendMessage(ctx, {
                            type: message_1.MessageType.ConnectionAck,
                        });
                        ctx.acknowledged = true;
                        break;
                    }
                    case message_1.MessageType.Subscribe: {
                        if (!ctx.acknowledged) {
                            return ctx.socket.close(4401, 'Unauthorized');
                        }
                        const operation = message.payload;
                        let execArgsMaybeSchema = {
                            schema,
                            operationName: operation.operationName,
                            document: typeof operation.query === 'string'
                                ? graphql_1.parse(operation.query)
                                : operation.query,
                            variableValues: operation.variables,
                        };
                        if (onSubscribe) {
                            execArgsMaybeSchema = await onSubscribe(ctx, message, execArgsMaybeSchema);
                        }
                        if (!execArgsMaybeSchema.schema) {
                            // not providing a schema is a fatal server error
                            return webSocketServer.emit('error', new Error('The GraphQL schema is not provided'));
                        }
                        // the execution arguments should be complete now
                        const execArgs = execArgsMaybeSchema;
                        // validate
                        const validationErrors = graphql_1.validate(execArgs.schema, execArgs.document, validationRules);
                        if (validationErrors.length > 0) {
                            return await sendMessage(ctx, {
                                id: message.id,
                                type: message_1.MessageType.Error,
                                payload: validationErrors,
                            });
                        }
                        // execute
                        const operationAST = graphql_1.getOperationAST(execArgs.document, execArgs.operationName);
                        if (!operationAST) {
                            throw new Error('Unable to get operation AST');
                        }
                        if (operationAST.operation === 'subscription') {
                            const subscriptionOrResult = await graphql_1.subscribe(execArgs);
                            if (utils_1.isAsyncIterable(subscriptionOrResult)) {
                                ctx.subscriptions[message.id] = subscriptionOrResult;
                                try {
                                    try {
                                        for (var subscriptionOrResult_1 = __asyncValues(subscriptionOrResult), subscriptionOrResult_1_1; subscriptionOrResult_1_1 = await subscriptionOrResult_1.next(), !subscriptionOrResult_1_1.done;) {
                                            let result = subscriptionOrResult_1_1.value;
                                            if (formatExecutionResult) {
                                                result = await formatExecutionResult(ctx, result);
                                            }
                                            await sendMessage(ctx, {
                                                id: message.id,
                                                type: message_1.MessageType.Next,
                                                payload: result,
                                            });
                                        }
                                    }
                                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                    finally {
                                        try {
                                            if (subscriptionOrResult_1_1 && !subscriptionOrResult_1_1.done && (_a = subscriptionOrResult_1.return)) await _a.call(subscriptionOrResult_1);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                    }
                                    const completeMessage = {
                                        id: message.id,
                                        type: message_1.MessageType.Complete,
                                    };
                                    await sendMessage(ctx, completeMessage);
                                    if (onComplete) {
                                        onComplete(ctx, completeMessage);
                                    }
                                }
                                catch (err) {
                                    await sendMessage(ctx, {
                                        id: message.id,
                                        type: message_1.MessageType.Error,
                                        payload: [
                                            new graphql_1.GraphQLError(err instanceof Error
                                                ? err.message
                                                : new Error(err).message),
                                        ],
                                    });
                                }
                                finally {
                                    delete ctx.subscriptions[message.id];
                                }
                            }
                            else {
                                let result = subscriptionOrResult;
                                if (formatExecutionResult) {
                                    result = await formatExecutionResult(ctx, result);
                                }
                                await sendMessage(ctx, {
                                    id: message.id,
                                    type: message_1.MessageType.Next,
                                    payload: result,
                                });
                                const completeMessage = {
                                    id: message.id,
                                    type: message_1.MessageType.Complete,
                                };
                                await sendMessage(ctx, completeMessage);
                                if (onComplete) {
                                    onComplete(ctx, completeMessage);
                                }
                            }
                        }
                        else {
                            // operationAST.operation === 'query' || 'mutation'
                            let result = await execute(execArgs);
                            if (formatExecutionResult) {
                                result = await formatExecutionResult(ctx, result);
                            }
                            await sendMessage(ctx, {
                                id: message.id,
                                type: message_1.MessageType.Next,
                                payload: result,
                            });
                            const completeMessage = {
                                id: message.id,
                                type: message_1.MessageType.Complete,
                            };
                            await sendMessage(ctx, completeMessage);
                            if (onComplete) {
                                onComplete(ctx, completeMessage);
                            }
                        }
                        break;
                    }
                    case message_1.MessageType.Complete: {
                        if (ctx.subscriptions[message.id]) {
                            await ((_b = ctx.subscriptions[message.id].return) !== null && _b !== void 0 ? _b : utils_1.noop)();
                        }
                        break;
                    }
                    default:
                        throw new Error(`Unexpected message of type ${message.type} received`);
                }
            }
            catch (err) {
                ctx.socket.close(4400, err.message);
            }
        };
    }
    return {
        webSocketServer,
        dispose: async () => {
            for (const client of webSocketServer.clients) {
                // 1001: Going away
                client.close(1001, 'Going away');
            }
            webSocketServer.removeAllListeners();
            await new Promise((resolve, reject) => webSocketServer.close((err) => (err ? reject(err) : resolve())));
        },
    };
}
exports.createServer = createServer;
function isErrorEvent(obj) {
    return (utils_1.isObject(obj) &&
        utils_1.hasOwnObjectProperty(obj, 'error') &&
        utils_1.hasOwnStringProperty(obj, 'message') &&
        utils_1.hasOwnStringProperty(obj, 'type'));
}
