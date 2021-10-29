/**
 *
 * utils
 *
 */
import { GraphQLError } from 'graphql';

// Extremely small optimisation, reduces runtime prototype traversal
const baseHasOwnProperty = Object.prototype.hasOwnProperty;

/** @private */
export function isObject(val: unknown): val is Record<PropertyKey, unknown> {
  return typeof val === 'object' && val !== null;
}

/** @private */
export function isAsyncIterable<T = unknown>(
  val: unknown,
): val is AsyncIterable<T> {
  return typeof Object(val)[Symbol.asyncIterator] === 'function';
}

/** @private */
export function isAsyncGenerator<T = unknown>(
  val: unknown,
): val is AsyncGenerator<T> {
  return (
    isObject(val) &&
    typeof Object(val)[Symbol.asyncIterator] === 'function' &&
    typeof val.return === 'function'
    // for lazy ones, we only need the return anyway
    // typeof val.throw === 'function' &&
    // typeof val.next === 'function'
  );
}

/** @private */
export function areGraphQLErrors(obj: unknown): obj is readonly GraphQLError[] {
  return (
    Array.isArray(obj) &&
    // must be at least one error
    obj.length > 0 &&
    // error has at least a message
    obj.every((ob) => 'message' in ob)
  );
}

/** @private */
export function hasOwnProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey,
>(obj: O, prop: P): obj is O & Record<P, unknown> {
  return baseHasOwnProperty.call(obj, prop);
}

/** @private */
export function hasOwnObjectProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey,
>(obj: O, prop: P): obj is O & Record<P, Record<PropertyKey, unknown>> {
  return baseHasOwnProperty.call(obj, prop) && isObject(obj[prop]);
}

/** @private */
export function hasOwnArrayProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey,
>(obj: O, prop: P): obj is O & Record<P, unknown[]> {
  return baseHasOwnProperty.call(obj, prop) && Array.isArray(obj[prop]);
}

/** @private */
export function hasOwnStringProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey,
>(obj: O, prop: P): obj is O & Record<P, string> {
  return baseHasOwnProperty.call(obj, prop) && typeof obj[prop] === 'string';
}

/**
 * Limits the WebSocket close event reason to not exceed a length of one frame.
 * Reference: https://datatracker.ietf.org/doc/html/rfc6455#section-5.2.
 *
 * @private
 */
export function limitCloseReason(reason: string, whenTooLong: string) {
  return reason.length < 124 ? reason : whenTooLong;
}
