/** Serializes revisioned writes. A rejected write pauses queued operations until retry. */
export class AttemptSaveQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private failure: unknown;

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      if (this.failure) throw this.failure;
      try {
        return await operation();
      } catch (error) {
        this.failure = error;
        throw error;
      }
    });
    this.tail = result.catch(() => undefined);
    return result;
  }

  retry() {
    this.failure = undefined;
  }
}
