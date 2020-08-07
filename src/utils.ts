/**
 *
 * utils
 *
 */

export function isObject(val: unknown): val is object {
  return typeof val === 'object' && val !== null;
}

export function hasOwnProperty<O extends object, P extends PropertyKey>(
  obj: O,
  prop: P,
): obj is O & Record<P, unknown> {
  return obj.hasOwnProperty(prop);
}

export function hasOwnObjectProperty<O extends object, P extends PropertyKey>(
  obj: O,
  prop: P,
): obj is O & Record<P, object> {
  return obj.hasOwnProperty(prop) && isObject((obj as any)[prop]);
}

export function hasOwnStringProperty<O extends object, P extends PropertyKey>(
  obj: O,
  prop: P,
): obj is O & Record<P, string> {
  return obj.hasOwnProperty(prop) && typeof (obj as any)[prop] === 'string';
}
