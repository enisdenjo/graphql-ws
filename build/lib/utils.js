"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limitCloseReason = exports.hasOwnStringProperty = exports.hasOwnArrayProperty = exports.hasOwnObjectProperty = exports.hasOwnProperty = exports.areGraphQLErrors = exports.isAsyncGenerator = exports.isAsyncIterable = exports.isObject = void 0;
// Extremely small optimisation, reduces runtime prototype traversal
const baseHasOwnProperty = Object.prototype.hasOwnProperty;
/** @private */
function isObject(val) {
    return typeof val === 'object' && val !== null;
}
exports.isObject = isObject;
/** @private */
function isAsyncIterable(val) {
    return typeof Object(val)[Symbol.asyncIterator] === 'function';
}
exports.isAsyncIterable = isAsyncIterable;
/** @private */
function isAsyncGenerator(val) {
    return (isObject(val) &&
        typeof Object(val)[Symbol.asyncIterator] === 'function' &&
        typeof val.return === 'function'
    // for lazy ones, we only need the return anyway
    // typeof val.throw === 'function' &&
    // typeof val.next === 'function'
    );
}
exports.isAsyncGenerator = isAsyncGenerator;
/** @private */
function areGraphQLErrors(obj) {
    return (Array.isArray(obj) &&
        // must be at least one error
        obj.length > 0 &&
        // error has at least a message
        obj.every((ob) => 'message' in ob));
}
exports.areGraphQLErrors = areGraphQLErrors;
/** @private */
function hasOwnProperty(obj, prop) {
    return baseHasOwnProperty.call(obj, prop);
}
exports.hasOwnProperty = hasOwnProperty;
/** @private */
function hasOwnObjectProperty(obj, prop) {
    return baseHasOwnProperty.call(obj, prop) && isObject(obj[prop]);
}
exports.hasOwnObjectProperty = hasOwnObjectProperty;
/** @private */
function hasOwnArrayProperty(obj, prop) {
    return baseHasOwnProperty.call(obj, prop) && Array.isArray(obj[prop]);
}
exports.hasOwnArrayProperty = hasOwnArrayProperty;
/** @private */
function hasOwnStringProperty(obj, prop) {
    return baseHasOwnProperty.call(obj, prop) && typeof obj[prop] === 'string';
}
exports.hasOwnStringProperty = hasOwnStringProperty;
/**
 * Limits the WebSocket close event reason to not exceed a length of one frame.
 * Reference: https://datatracker.ietf.org/doc/html/rfc6455#section-5.2.
 *
 * @private
 */
function limitCloseReason(reason, whenTooLong) {
    return reason.length < 124 ? reason : whenTooLong;
}
exports.limitCloseReason = limitCloseReason;
