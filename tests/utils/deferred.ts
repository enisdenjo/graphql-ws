export interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export function createDeferred<T = void>(): PromiseWithResolvers<T> {
  if (Promise.withResolvers) {
    return Promise.withResolvers<T>();
  }
  let resolve!: PromiseWithResolvers<T>['resolve'];
  let reject!: PromiseWithResolvers<T>['reject'];
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}
