import { describe, expect, it, vi } from 'vitest';
import { downloadWordbankCsv } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank-export';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';

const labels = {
  title: 'Wordbank',
  word: 'Word',
  pronunciation: 'Pronunciation',
  englishDefinition: 'English definition',
  vietnameseTranslation: 'Vietnamese translation',
  exampleSentence: 'Example sentence',
  mastery: 'Mastery',
  wordLists: 'Word Lists',
};

const item: SavedVocabularyItem = {
  audioUrl: null,
  englishDefinition: 'to voluntarily give up',
  exampleSentence: 'A player can resign.',
  id: 'saved-vocabulary-1',
  ipa: '/rɪˈzaɪn/',
  lists: [{ colorCode: null, id: 'list-1', name: 'Space' }],
  masteryLevel: 1,
  nextReviewAt: '2026-06-21T00:00:00.000Z',
  partOfSpeech: 'verb',
  savedAt: '2026-06-21T00:00:00.000Z',
  sourceSnippet: null,
  vietnameseTranslation: 'từ bỏ, thừa nhận thất bại',
  word: 'resign',
};

describe('downloadWordbankCsv', () => {
  it('exports UTF-8 CSV content with a timestamped filename', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 9, 8, 7));

    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:wordbank-csv');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    try {
      downloadWordbankCsv([item], labels);

      const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const csv = await blob.text();

      expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
      expect(csv).toContain('/rɪˈzaɪn/');
      expect(csv).toContain('từ bỏ, thừa nhận thất bại');
      expect(click.mock.contexts[0]).toHaveAttribute(
        'download',
        'wordbank-21-06-2026-09-08.csv'
      );
      expect(click).toHaveBeenCalledOnce();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:wordbank-csv');
    } finally {
      vi.useRealTimers();
      click.mockRestore();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    }
  });
});
