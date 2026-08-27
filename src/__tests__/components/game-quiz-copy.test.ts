import { describe, expect, it } from 'vitest';
import { getGameQuizCopy } from '@/components/game-quiz/copy';

describe('game quiz copy', () => {
  it('can cross the server-to-client serialization boundary', () => {
    const copy = getGameQuizCopy((key) => key);

    expect(() => structuredClone(copy)).not.toThrow();
  });
});
