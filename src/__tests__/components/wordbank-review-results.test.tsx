import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WordbankReviewResults } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank-mastery';

const messages: Record<string, string> = {
  columnMeaning: 'Meaning',
  columnWord: 'Word',
  masteryFamiliar: 'Familiar',
  masteryMastered: 'Mastered',
  masteryNew: 'New',
  newMasteryLabel: 'New mastery',
  reviewOutcome: 'Outcome',
  reviewResultCorrect: 'Correct',
  reviewResultMissed: 'Missed',
  reviewResultsTitle: 'Word mastery updates',
};

const t = (key: string) => messages[key] ?? key;

describe('WordbankReviewResults', () => {
  it('keeps the new mastery column visible next to long meanings', () => {
    render(
      <WordbankReviewResults
        results={[
          {
            englishDefinition:
              'A system of millions or billions of stars, together with gas and dust, held together by gravity.',
            isCorrect: true,
            nextMasteryLevel: 2,
            previousMasteryLevel: 1,
            savedVocabularyId: 'saved-vocabulary-1',
            vietnameseTranslation:
              'Thiên hà, hệ thống khổng lồ chứa hàng tỷ ngôi sao và bụi vũ trụ.',
            word: 'galaxy',
          },
        ]}
        t={t}
      />
    );

    expect(screen.getByRole('table')).toHaveClass('table-fixed');
    expect(
      screen.getByRole('columnheader', { name: 'New mastery' })
    ).toBeInTheDocument();
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(
      screen
        .getByText(/A system of millions or billions of stars/)
        .closest('td')
    ).toHaveClass('whitespace-normal');
  });
});
