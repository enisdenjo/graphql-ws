/**
 *
 * utils
 *
 */

export type Optional<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> &
  Partial<Pick<T, K>>;
import { GraphQLError } from 'graphql';

export function isObject(val: unknown): val is Record<PropertyKey, unknown> {
  return typeof val === 'object' && val !== null;
}

export function isAsyncIterable<T = unknown>(
  val: unknown,
): val is AsyncIterableIterator<T> {
  return typeof Object(val)[Symbol.asyncIterator] === 'function';
}

export function areGraphQLErrors(obj: unknown): obj is GraphQLError[] {
  return (
    Array.isArray(obj) &&
    // must be at least one error
    obj.length > 0 &&
    // error has at least a message
    obj.every((ob) => 'message' in ob)
  );
}

export function hasOwnProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey
>(obj: O, prop: P): obj is O & Record<P, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function hasOwnObjectProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey
>(obj: O, prop: P): obj is O & Record<P, Record<PropertyKey, unknown>> {
  return Object.prototype.hasOwnProperty.call(obj, prop) && isObject(obj[prop]);
}

export function hasOwnArrayProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey
>(obj: O, prop: P): obj is O & Record<P, unknown[]> {
  return (
    Object.prototype.hasOwnProperty.call(obj, prop) && Array.isArray(obj[prop])
  );
}

export function hasOwnStringProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey
>(obj: O, prop: P): obj is O & Record<P, string> {
  return (
    Object.prototype.hasOwnProperty.call(obj, prop) &&
    typeof obj[prop] === 'string'
  );
}
