export class PushPullAsyncIterableIterator<T>
  implements AsyncIterableIterator<T> {
  public pushQueue: T[] = [];
  private pullQueue: ((value: IteratorResult<T>) => void)[] = [];
  private isRunning = true;

  public async next(): Promise<IteratorResult<T>> {
    return new Promise((resolve) => {
      if (this.pushQueue.length !== 0) {
        resolve(
          this.isRunning
            ? // We check for length
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              { value: this.pushQueue.shift()!, done: false }
            : { value: undefined, done: true },
        );
      } else {
        this.pullQueue.push(resolve);
      }
    });
  }

  public async return(): Promise<IteratorResult<T>> {
    if (this.isRunning) {
      this.isRunning = false;
      for (const resolve of this.pullQueue) {
        resolve({ value: undefined, done: true });
      }
      this.pullQueue.length = 0;
      this.pushQueue.length = 0;
    }
    return { value: undefined, done: true };
  }

  public [Symbol.asyncIterator](): PushPullAsyncIterableIterator<T> {
    return this;
  }

  public push(value: T): void {
    if (this.pullQueue.length > 0) {
      // We check for length
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const resolve = this.pullQueue.shift()!;
      resolve(
        this.isRunning
          ? { value, done: false }
          : { value: undefined, done: true },
      );
    } else {
      this.pushQueue.push(value);
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
