"use strict";
/**
 *
 * utils
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.noop = exports.hasOwnStringProperty = exports.hasOwnArrayProperty = exports.hasOwnObjectProperty = exports.hasOwnProperty = exports.isAsyncIterable = exports.isArray = exports.isObject = void 0;
function isObject(val) {
    return typeof val === 'object' && val !== null;
}
exports.isObject = isObject;
function isArray(val) {
    return typeof val === 'object' && val !== null && Array.isArray(val);
}
exports.isArray = isArray;
function isAsyncIterable(val) {
    return typeof Object(val)[Symbol.asyncIterator] === 'function';
}
exports.isAsyncIterable = isAsyncIterable;
function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
exports.hasOwnProperty = hasOwnProperty;
function hasOwnObjectProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop) && isObject(obj[prop]);
}
exports.hasOwnObjectProperty = hasOwnObjectProperty;
function hasOwnArrayProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop) && isArray(obj[prop]);
}
exports.hasOwnArrayProperty = hasOwnArrayProperty;
function hasOwnStringProperty(obj, prop) {
    return (Object.prototype.hasOwnProperty.call(obj, prop) &&
        typeof obj[prop] === 'string');
}
exports.hasOwnStringProperty = hasOwnStringProperty;
function noop() {
    /**/
}
exports.noop = noop;
