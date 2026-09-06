import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BulkActionBar } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank-components';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';

const messages: Record<string, string> = {
  bulkSelected: '{count} selected',
  exportCsv: 'Export CSV',
  generateSelectedQuiz: 'Generate Quiz',
  manageLists: 'Manage Lists',
  markFamiliar: 'Mark Familiar',
  markMastered: 'Mark Mastered',
  markNew: 'Mark New',
};

const t = (key: string, values?: Record<string, string | number>) => {
  let message = messages[key] ?? key;

  for (const [name, value] of Object.entries(values ?? {})) {
    message = message.replace(`{${name}}`, String(value));
  }

  return message;
};

const selectedItems: SavedVocabularyItem[] = [
  {
    audioUrl: null,
    englishDefinition: 'to voluntarily give up',
    exampleSentence: 'A player can resign.',
    id: 'saved-1',
    ipa: '/rɪˈzaɪn/',
    lists: [],
    masteryLevel: 1,
    nextReviewAt: '2026-06-21T00:00:00.000Z',
    partOfSpeech: 'verb',
    savedAt: '2026-06-21T00:00:00.000Z',
    sourceSnippet: null,
    vietnameseTranslation: 'từ bỏ',
    word: 'resign',
  },
];

describe('BulkActionBar', () => {
  it('can generate a quiz from selected words', () => {
    const onGenerateQuiz = vi.fn();

    render(
      <BulkActionBar
        isGeneratingQuiz={false}
        isExportingCsvToDrive={false}
        isUpdating={false}
        lists={[]}
        onExportCsv={vi.fn()}
        onExportCsvToDrive={vi.fn()}
        onGenerateQuiz={onGenerateQuiz}
        onMarkMastery={vi.fn()}
        onUpdateLists={vi.fn()}
        selectedCount={1}
        selectedItems={selectedItems}
        t={t}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Generate Quiz' }));

    expect(onGenerateQuiz).toHaveBeenCalledTimes(1);
  });
});
