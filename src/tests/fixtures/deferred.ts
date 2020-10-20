type Deferred<T = void> = {
  resolve: (input: T) => void;
  reject: (input: unknown) => void;
  promise: Promise<T>;
  status: 'pending' | 'resolved' | 'rejected';
};

export const createDeferred = <T = void>(): Deferred<T> => {
  let d = {} as Deferred<T>;
  const promise = new Promise<T>((resolve, reject) => {
    d = {
      status: 'pending',
      resolve: (arg: T) => {
        d.status = 'resolved';
        resolve(arg);
      },
      reject: (reason?: unknown) => {
        d.status = 'rejected';
        reject(reason);
      },
    } as Deferred<T>;
  });
  d.promise = promise;
  return d as Deferred<T>;
};
