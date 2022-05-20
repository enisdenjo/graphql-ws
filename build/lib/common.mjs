/**
 *
 * common
 *
 */
import { isObject, areGraphQLErrors, hasOwnProperty, hasOwnObjectProperty, hasOwnStringProperty, } from './utils.mjs';
/**
 * The WebSocket sub-protocol used for the [GraphQL over WebSocket Protocol](/PROTOCOL.md).
 *
 * @category Common
 */
export const GRAPHQL_TRANSPORT_WS_PROTOCOL = 'graphql-transport-ws';
/**
 * The deprecated subprotocol used by [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws).
 *
 * @private
 */
export const DEPRECATED_GRAPHQL_WS_PROTOCOL = 'graphql-ws';
/**
 * `graphql-ws` expected and standard close codes of the [GraphQL over WebSocket Protocol](/PROTOCOL.md).
 *
 * @category Common
 */
export var CloseCode;
(function (CloseCode) {
    CloseCode[CloseCode["InternalServerError"] = 4500] = "InternalServerError";
    CloseCode[CloseCode["InternalClientError"] = 4005] = "InternalClientError";
    CloseCode[CloseCode["BadRequest"] = 4400] = "BadRequest";
    CloseCode[CloseCode["BadResponse"] = 4004] = "BadResponse";
    /** Tried subscribing before connect ack */
    CloseCode[CloseCode["Unauthorized"] = 4401] = "Unauthorized";
    CloseCode[CloseCode["Forbidden"] = 4403] = "Forbidden";
    CloseCode[CloseCode["SubprotocolNotAcceptable"] = 4406] = "SubprotocolNotAcceptable";
    CloseCode[CloseCode["ConnectionInitialisationTimeout"] = 4408] = "ConnectionInitialisationTimeout";
    CloseCode[CloseCode["ConnectionAcknowledgementTimeout"] = 4504] = "ConnectionAcknowledgementTimeout";
    /** Subscriber distinction is very important */
    CloseCode[CloseCode["SubscriberAlreadyExists"] = 4409] = "SubscriberAlreadyExists";
    CloseCode[CloseCode["TooManyInitialisationRequests"] = 4429] = "TooManyInitialisationRequests";
})(CloseCode || (CloseCode = {}));
/**
 * Types of messages allowed to be sent by the client/server over the WS protocol.
 *
 * @category Common
 */
export var MessageType;
(function (MessageType) {
    MessageType["ConnectionInit"] = "connection_init";
    MessageType["ConnectionAck"] = "connection_ack";
    MessageType["Ping"] = "ping";
    MessageType["Pong"] = "pong";
    MessageType["Subscribe"] = "subscribe";
    MessageType["Next"] = "next";
    MessageType["Error"] = "error";
    MessageType["Complete"] = "complete";
})(MessageType || (MessageType = {}));
/**
 * Checks if the provided value is a message.
 *
 * @category Common
 */
export function isMessage(val) {
    if (isObject(val)) {
        // all messages must have the `type` prop
        if (!hasOwnStringProperty(val, 'type')) {
            return false;
        }
        // validate other properties depending on the `type`
        switch (val.type) {
            case MessageType.ConnectionInit:
                // the connection init message can have optional payload object
                return (!hasOwnProperty(val, 'payload') ||
                    val.payload === undefined ||
                    isObject(val.payload));
            case MessageType.ConnectionAck:
            case MessageType.Ping:
            case MessageType.Pong:
                // the connection ack, ping and pong messages can have optional payload object too
                return (!hasOwnProperty(val, 'payload') ||
                    val.payload === undefined ||
                    isObject(val.payload));
            case MessageType.Subscribe:
                return (hasOwnStringProperty(val, 'id') &&
                    hasOwnObjectProperty(val, 'payload') &&
                    (!hasOwnProperty(val.payload, 'operationName') ||
                        val.payload.operationName === undefined ||
                        val.payload.operationName === null ||
                        typeof val.payload.operationName === 'string') &&
                    hasOwnStringProperty(val.payload, 'query') &&
                    (!hasOwnProperty(val.payload, 'variables') ||
                        val.payload.variables === undefined ||
                        val.payload.variables === null ||
                        hasOwnObjectProperty(val.payload, 'variables')) &&
                    (!hasOwnProperty(val.payload, 'extensions') ||
                        val.payload.extensions === undefined ||
                        val.payload.extensions === null ||
                        hasOwnObjectProperty(val.payload, 'extensions')));
            case MessageType.Next:
                return (hasOwnStringProperty(val, 'id') &&
                    hasOwnObjectProperty(val, 'payload'));
            case MessageType.Error:
                return hasOwnStringProperty(val, 'id') && areGraphQLErrors(val.payload);
            case MessageType.Complete:
                return hasOwnStringProperty(val, 'id');
            default:
                return false;
        }
    }
    return false;
}
/**
 * Parses the raw websocket message data to a valid message.
 *
 * @category Common
 */
export function parseMessage(data, reviver) {
    if (isMessage(data)) {
        return data;
    }
    if (typeof data !== 'string') {
        throw new Error('Message not parsable');
    }
    const message = JSON.parse(data, reviver);
    if (!isMessage(message)) {
        throw new Error('Invalid message');
    }
    return message;
}
/**
 * Stringifies a valid message ready to be sent through the socket.
 *
 * @category Common
 */
export function stringifyMessage(msg, replacer) {
    if (!isMessage(msg)) {
        throw new Error('Cannot stringify invalid message');
    }
    return JSON.stringify(msg, replacer);
}
