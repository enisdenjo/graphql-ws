/**
 *
 * utils
 *
 */
import { GraphQLError } from 'graphql';

/** @private */
export function extendedTypeof(
  val: unknown,
):
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'
  | 'object'
  | 'function'
  | 'array'
  | 'null' {
  if (val === null) {
    return 'null';
  }
  if (Array.isArray(val)) {
    return 'array';
  }
  return typeof val;
}

/** @private */
export function isObject(val: unknown): val is Record<PropertyKey, unknown> {
  return extendedTypeof(val) === 'object';
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

/**
 * Limits the WebSocket close event reason to not exceed a length of one frame.
 * Reference: https://datatracker.ietf.org/doc/html/rfc6455#section-5.2.
 *
 * @private
 */
export function limitCloseReason(reason: string, whenTooLong: string) {
  return reason.length < 124 ? reason : whenTooLong;
}
