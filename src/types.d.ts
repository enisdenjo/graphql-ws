/**
 *
 * types
 *
 */

/**
 * UUID v4 string type alias generated through the
 * `generateUUID` function from the client.
 */
export type UUID = string;

export interface Disposable {
  dispose: () => Promise<void>;
}

export interface Sink<T = unknown> {
  next(value: T): void;
  error(error: Error): void;
  complete(): void;
}
