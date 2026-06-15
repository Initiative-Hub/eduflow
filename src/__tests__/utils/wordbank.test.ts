import { describe, expect, it } from 'vitest';
import { filterAndSortWordbankItems } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank.utils';

const items = [
  {
    id: '1',
    word: 'galaxy',
    partOfSpeech: 'noun',
    ipa: '/ˈɡæləksi/',
    audioUrl: null,
    englishDefinition: 'A system of stars.',
    vietnameseTranslation: 'Thiên hà.',
    exampleSentence: 'The galaxy is bright.',
    sourceSnippet: null,
    savedAt: '2026-06-15T00:00:00.000Z',
  },
  {
    id: '2',
    word: 'observable',
    partOfSpeech: 'adjective',
    ipa: '/əbˈzɝːvəbl/',
    audioUrl: null,
    englishDefinition: 'Able to be seen.',
    vietnameseTranslation: 'Có thể quan sát.',
    exampleSentence: 'The observable universe is vast.',
    sourceSnippet: null,
    savedAt: '2026-06-16T00:00:00.000Z',
  },
];

describe('filterAndSortWordbankItems', () => {
  it('filters by search text and part of speech before sorting', () => {
    const result = filterAndSortWordbankItems(items, {
      search: 'observ',
      partOfSpeech: 'adjective',
      sort: 'az',
    });

    expect(result.map((item) => item.word)).toEqual(['observable']);
  });

  it('sorts recently saved words first by default', () => {
    const result = filterAndSortWordbankItems(items, {
      search: '',
      partOfSpeech: 'all',
      sort: 'recent',
    });

    expect(result.map((item) => item.word)).toEqual(['observable', 'galaxy']);
  });
});
