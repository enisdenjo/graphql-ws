export * from './tclient';
export * from './tservers';

/** A simple since Jest v27 does not allow combining async and using the done argument. */
export function waitForDone(
  cb: (done: () => void) => Promise<void>,
): () => Promise<void> {
  return () =>
    new Promise<void>((resolve, reject) => cb(resolve).catch(reject));
}
