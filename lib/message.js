"use strict";
/**
 *
 * message
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyMessage = exports.parseMessage = exports.isMessage = exports.MessageType = void 0;
const utils_1 = require("./utils");
/** Types of messages allowed to be sent by the client/server over the WS protocol. */
var MessageType;
(function (MessageType) {
    MessageType["ConnectionInit"] = "connection_init";
    MessageType["ConnectionAck"] = "connection_ack";
    MessageType["Subscribe"] = "subscribe";
    MessageType["Next"] = "next";
    MessageType["Error"] = "error";
    MessageType["Complete"] = "complete";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
/** @ignore */
function isMessage(val) {
    if (utils_1.isObject(val)) {
        // all messages must have the `type` prop
        if (!utils_1.hasOwnProperty(val, 'type')) {
            return false;
        }
        // validate other properties depending on the `type`
        switch (val.type) {
            case MessageType.ConnectionInit:
                // the connection init message can have optional object `connectionParams` in the payload
                return (!utils_1.hasOwnProperty(val, 'payload') ||
                    val.payload === undefined ||
                    utils_1.isObject(val.payload));
            case MessageType.ConnectionAck:
                return true;
            case MessageType.Subscribe:
                return (utils_1.hasOwnStringProperty(val, 'id') &&
                    utils_1.hasOwnObjectProperty(val, 'payload') &&
                    utils_1.hasOwnStringProperty(val.payload, 'operationName') &&
                    (utils_1.hasOwnStringProperty(val.payload, 'query') || // string query
                        utils_1.hasOwnObjectProperty(val.payload, 'query')) && // document node query
                    utils_1.hasOwnObjectProperty(val.payload, 'variables'));
            case MessageType.Next:
                return (utils_1.hasOwnStringProperty(val, 'id') &&
                    utils_1.hasOwnObjectProperty(val, 'payload') &&
                    // ExecutionResult
                    (utils_1.hasOwnObjectProperty(val.payload, 'data') ||
                        utils_1.hasOwnObjectProperty(val.payload, 'errors')));
            case MessageType.Error:
                return (utils_1.hasOwnStringProperty(val, 'id') &&
                    // GraphQLError
                    utils_1.hasOwnArrayProperty(val, 'payload') &&
                    val.payload.length > 0 // must be at least one error
                );
            case MessageType.Complete:
                return utils_1.hasOwnStringProperty(val, 'id');
            default:
                return false;
        }
    }
    return false;
}
exports.isMessage = isMessage;
/** @ignore */
function parseMessage(data) {
    if (isMessage(data)) {
        return data;
    }
    if (typeof data === 'string') {
        const message = JSON.parse(data);
        if (!isMessage(message)) {
            throw new Error('Invalid message');
        }
        return message;
    }
    throw new Error('Message not parsable');
}
exports.parseMessage = parseMessage;
/**
 * @ignore
 * Helps stringifying a valid message ready to be sent through the socket.
 */
function stringifyMessage(msg) {
    if (!isMessage(msg)) {
        throw new Error('Cannot stringify invalid message');
    }
    return JSON.stringify(msg);
}
exports.stringifyMessage = stringifyMessage;
