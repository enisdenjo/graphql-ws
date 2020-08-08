/**
 *
 * types
 *
 */

export interface Disposable {
  dispose: () => Promise<void>;
}

export interface Sink<T = any> {
  next(value: T): void;
  error(error: Error): void;
  complete(): void;
}
