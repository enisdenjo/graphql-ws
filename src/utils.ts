/**
 *
 * utils
 *
 */

export function isObject(val: unknown): val is Record<PropertyKey, unknown> {
  return typeof val === 'object' && val !== null;
}

export function isArray(val: unknown): val is unknown[] {
  return typeof val === 'object' && val !== null && Array.isArray(val);
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
  return Object.prototype.hasOwnProperty.call(obj, prop) && isArray(obj[prop]);
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
