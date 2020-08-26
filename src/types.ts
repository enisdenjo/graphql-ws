/**
 *
 * types
 *
 */

import { GraphQLError } from 'graphql';

/**
 * UUID v4 string type alias generated through the
 * `generateUUID` function from the client.
 */
export type UUID = string;

export interface Disposable {
  /** Dispose of the instance and clear up resources. */
  dispose: () => Promise<void>;
}

/**
 * A representation of any set of values over any amount of time.
 */
export interface Sink<T = unknown> {
  /** Next value arriving. */
  next(value: T): void;
  /** An error that has occured. Calling this function "closes" the sink. */
  error(error: Error | CloseEvent | readonly GraphQLError[]): void;
  /** The sink has completed. This function "closes" the sink. */
  complete(): void;
}
