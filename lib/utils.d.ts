/**
 *
 * utils
 *
 */
export declare type Optional<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Partial<Pick<T, K>>;
export declare function isObject(val: unknown): val is Record<PropertyKey, unknown>;
export declare function isArray(val: unknown): val is unknown[];
export declare function isAsyncIterable<T = unknown>(val: unknown): val is AsyncIterableIterator<T>;
export declare function hasOwnProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, unknown>;
export declare function hasOwnObjectProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, Record<PropertyKey, unknown>>;
export declare function hasOwnArrayProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, unknown[]>;
export declare function hasOwnStringProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, string>;
export declare function noop(): void;
