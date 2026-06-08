import { describe, expect, it } from 'vitest';
import { splitEnglishIntoDictionaryTokens } from '@/utils/english-text-tokens';

describe('splitEnglishIntoDictionaryTokens', () => {
  it('separates English words from punctuation while preserving original text', () => {
    const tokens = splitEnglishIntoDictionaryTokens(
      "Hello, friend -- don't stop."
    );

    expect(tokens.map((token) => token.text).join('')).toBe(
      "Hello, friend -- don't stop."
    );
    expect(tokens.filter((token) => token.type === 'word')).toEqual([
      { type: 'word', text: 'Hello', lookup: 'hello' },
      { type: 'word', text: 'friend', lookup: 'friend' },
      { type: 'word', text: "don't", lookup: "don't" },
      { type: 'word', text: 'stop', lookup: 'stop' },
    ]);
  });
});
