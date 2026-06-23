import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordbankToolbar } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank-components';

const messages: Record<string, string> = {
  allWordLists: 'All Word Lists',
  filterOptionWithCount: '{label} ({count})',
  generateDueQuiz: 'Generate Due Quiz',
  gridView: 'Grid view',
  listView: 'List view',
  masteryAll: 'All mastery',
  masteryDue: 'Due for review',
  masteryFamiliar: 'Familiar',
  masteryLabel: 'Mastery',
  masteryMastered: 'Mastered',
  masteryNew: 'New',
  practiceMode: 'Blur meanings & Click to Reveal',
  savedTodayStat: '{count} saved today',
  savedWordsStat: '{count} saved',
  searchLabel: 'Search Wordbank',
  searchPlaceholder: 'Search words...',
  sortAz: 'A-Z',
  sortLabel: 'Sort Wordbank',
  sortRecent: 'Recently added',
  sortRecentWithSavedToday: 'Recently added ({count} today)',
  sortWeakest: 'Needs review first',
  viewLabel: 'Wordbank view',
  wordLists: 'Word Lists',
};

const t = (key: string, values?: Record<string, string | number>) => {
  let message = messages[key] ?? key;

  for (const [name, value] of Object.entries(values ?? {})) {
    message = message.replace(`{${name}}`, String(value));
  }

  return message;
};

describe('WordbankToolbar', () => {
  it('moves summary counts into filters and labels the reveal toggle clearly', () => {
    render(
      <WordbankToolbar
        isGeneratingReview={false}
        listId="all"
        lists={[{ colorCode: null, id: 'list-1', name: 'Space', wordCount: 3 }]}
        mastery="all"
        onGenerateReview={vi.fn()}
        onListChange={vi.fn()}
        onMasteryChange={vi.fn()}
        onPracticeModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onViewChange={vi.fn()}
        practiceMode={false}
        search=""
        sort="recent"
        stats={{
          dueWords: 1,
          familiarWords: 5,
          masteredWords: 1,
          newWords: 1,
          savedToday: 0,
          savedWords: 7,
        }}
        t={t}
        view="grid"
      />
    );

    expect(screen.queryByText('7 saved')).not.toBeInTheDocument();
    expect(screen.queryByText('0 saved today')).not.toBeInTheDocument();
    expect(screen.queryByText('1 due')).not.toBeInTheDocument();
    expect(
      screen.getByText('Blur meanings & Click to Reveal')
    ).toBeInTheDocument();
    expect(screen.getByText('All Word Lists (7)')).toBeInTheDocument();
    expect(screen.getByText('All mastery (7)')).toBeInTheDocument();
  });

  it('hides the reveal toggle in list view', () => {
    render(
      <WordbankToolbar
        isGeneratingReview={false}
        listId="all"
        lists={[]}
        mastery="all"
        onGenerateReview={vi.fn()}
        onListChange={vi.fn()}
        onMasteryChange={vi.fn()}
        onPracticeModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onSortChange={vi.fn()}
        onViewChange={vi.fn()}
        practiceMode={false}
        search=""
        sort="recent"
        stats={{
          dueWords: 1,
          familiarWords: 5,
          masteredWords: 1,
          newWords: 1,
          savedToday: 0,
          savedWords: 7,
        }}
        t={t}
        view="list"
      />
    );

    expect(
      screen.queryByText('Blur meanings & Click to Reveal')
    ).not.toBeInTheDocument();
  });
});
