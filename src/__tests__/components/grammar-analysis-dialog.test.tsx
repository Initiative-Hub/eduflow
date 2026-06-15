import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GrammarAnalysisDialog } from '@/components/english/grammar-analysis-dialog';

const messages: Record<string, string> = {
  analyzedSentence: 'Analyzed Sentence',
  analyzing: 'Analyzing...',
  close: 'Close',
  title: 'Grammar & Style Analysis',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => messages[key] ?? key,
}));

describe('GrammarAnalysisDialog', () => {
  it('uses compact typography while grammar analysis is loading', () => {
    render(
      <GrammarAnalysisDialog
        analysis={null}
        isLoading={true}
        onOpenChange={() => {}}
        open={true}
        sentence="She go to school every day."
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Grammar & Style Analysis' })
    ).toHaveClass('text-xl');
    expect(screen.getByText('Analyzed Sentence')).toHaveClass('text-xs');
    expect(
      screen.getByText((_content, element) =>
        Boolean(
          element?.id === 'grammar-analysis-desc' &&
            element.textContent?.includes('She go to school every day.')
        )
      )
    ).toHaveClass('text-sm');
  });
});
