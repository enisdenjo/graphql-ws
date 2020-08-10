/**
 *
 * utils
 *
 */

export function isObject(val: unknown): val is Record<PropertyKey, unknown> {
  return typeof val === 'object' && val !== null;
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

export function hasOwnStringProperty<
  O extends Record<PropertyKey, unknown>,
  P extends PropertyKey
>(obj: O, prop: P): obj is O & Record<P, string> {
  return (
    Object.prototype.hasOwnProperty.call(obj, prop) &&
    typeof obj[prop] === 'string'
  );
}
