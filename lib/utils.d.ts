/**
 *
 * utils
 *
 */
import { GraphQLError } from 'graphql';
/** @private */
export declare function isObject(val: unknown): val is Record<PropertyKey, unknown>;
/** @private */
export declare function isAsyncIterable<T = unknown>(val: unknown): val is AsyncIterable<T>;
/** @private */
export declare function isAsyncGenerator<T = unknown>(val: unknown): val is AsyncGenerator<T>;
/** @private */
export declare function areGraphQLErrors(obj: unknown): obj is readonly GraphQLError[];
/** @private */
export declare function hasOwnProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, unknown>;
/** @private */
export declare function hasOwnObjectProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, Record<PropertyKey, unknown>>;
/** @private */
export declare function hasOwnArrayProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, unknown[]>;
/** @private */
export declare function hasOwnStringProperty<O extends Record<PropertyKey, unknown>, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, string>;
/**
 * Limits the WebSocket close event reason to not exceed a length of one frame.
 * Reference: https://datatracker.ietf.org/doc/html/rfc6455#section-5.2.
 *
 * @private
 */
export declare function limitCloseReason(reason: string, whenTooLong: string): string;
