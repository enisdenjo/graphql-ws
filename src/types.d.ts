/**
 *
 * types
 *
 */

export interface Disposable {
  dispose: () => Promise<void>;
}

export interface Sink<T = unknown> {
  next(value: T): void;
  error(error: Error): void;
  complete(): void;
}
