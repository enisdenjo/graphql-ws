declare namespace jest {
  // jest-jasmine2 runner allows done callback with promises
  type ProvidesCallback = (
    cb: DoneCallback,
  ) => void | undefined | Promise<unknown>;
}
