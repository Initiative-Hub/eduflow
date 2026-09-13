import { describe, expect, it } from 'vitest';
import { AttemptSaveQueue } from '@/lib/quiz-template/attempt-save-queue';

describe('attempt save queue', () => {
  it('waits for acknowledged revisions before executing the next write', async () => {
    const queue = new AttemptSaveQueue();
    let revision = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = queue.run(async () => {
      await gate;
      revision = 1;
    });
    const second = queue.run(async () => revision);
    release();
    await first;
    expect(await second).toBe(1);
  });
  it('pauses queued operations after failure until an explicit retry', async () => {
    const queue = new AttemptSaveQueue();
    await expect(
      queue.run(async () => {
        throw new Error('offline');
      })
    ).rejects.toThrow('offline');
    await expect(queue.run(async () => 1)).rejects.toThrow('offline');
    queue.retry();
    expect(await queue.run(async () => 2)).toBe(2);
  });
});
