import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnglishAssistantClient } from '@/app/[locale]/(dashboard)/english/_components/english-assistant-client';

const messages: Record<string, string> = {
  aiAnalyticsActive: 'AI Analytics Active',
  analyzing: 'Analyzing...',
  assistantTitle: 'English Assistant',
  characters: 'characters',
  columnDefinition: 'Definition (EN -> VI)',
  columnExample: 'Example',
  columnIPA: 'IPA',
  columnWord: 'Word',
  copySourceTooltip: 'Copy source text',
  copyTooltip: 'Copy translation',
  copiedTooltip: 'Copied',
  emptyState: 'No vocabulary items yet.',
  english: 'English',
  exportPdf: 'Export PDF',
  hoverLookupHint: 'Hover a word to look it up.',
  inputPlaceholder: 'Paste or type your English text here...',
  pageSubtitle: 'English study tools',
  saveToLibrary: 'Save to Library',
  shareTooltip: 'Share',
  sourceContent: 'Source Content',
  swapDirection: 'Swap translation direction',
  title: 'Key Vocabulary',
  translateAndAnalyze: 'Translate & Analyze',
  translationPlaceholder: 'Translation will appear here after analysis...',
  vietnamese: 'Vietnamese',
  words: 'words',
  providerAmazon: 'Amazon Translate',
  providerAmazonBadge: '2M free/mo',
  providerAmazonInfo: 'Amazon info',
  providerAI: 'AI',
  providerAIBadge: 'AI tokens',
  providerAIInfo: 'AI info',
  providerMyMemory: 'MyMemory',
  providerMyMemoryBadge: 'FREE',
  providerMyMemoryInfo: 'MyMemory info',
  label: 'Translation Engine',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => messages[key] ?? key,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/english/grammar-analysis-dialog', () => ({
  GrammarAnalysisDialog: () => null,
}));

vi.mock('@/components/dictionary/word-dictionary-popover', () => ({
  WordDictionaryPopover: ({
    open,
    word,
  }: {
    open: boolean;
    word: string | null;
  }) =>
    open && word ? (
      <div data-testid="word-dictionary-popover">Dictionary lookup: {word}</div>
    ) : null,
}));

describe('EnglishAssistantClient', () => {
  const clipboardWriteText = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    clipboardWriteText.mockClear();
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/api/v1/english/translate')) {
          return new Response(JSON.stringify({ translatedText: 'Xin chào' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (url.includes('/api/v1/english/analyze')) {
          return new Response(
            JSON.stringify({
              vocabulary: [
                {
                  word: 'hello',
                  partOfSpeech: 'interjection',
                  ipa: '/həˈloʊ/',
                  audioUrl: null,
                  englishDefinition: 'A greeting.',
                  vietnameseTranslation: 'Một lời chào.',
                  exampleSentence: 'Hello there.',
                },
              ],
              sentences: ['Hello there.'],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(null, { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears the translated text when the source text is emptied', async () => {
    const user = userEvent.setup();

    render(<EnglishAssistantClient />);

    const sourceInput = screen.getByRole('textbox', {
      name: 'Source Content',
    });
    await user.type(sourceInput, 'Hello there.');
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    expect(await screen.findByText('Xin chào')).toBeInTheDocument();

    await user.clear(sourceInput);

    await waitFor(() => {
      expect(screen.queryByText('Xin chào')).not.toBeInTheDocument();
    });
    expect(
      screen.getByText('Translation will appear here after analysis...')
    ).toBeInTheDocument();
  });

  it('sends the default translation engine to the translate endpoint', async () => {
    const user = userEvent.setup();

    render(<EnglishAssistantClient />);

    await user.type(
      screen.getByRole('textbox', { name: 'Source Content' }),
      'Hello there.'
    );
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/english/translate',
        expect.objectContaining({
          body: expect.stringContaining('"provider":"amazon"'),
        })
      );
    });
  });

  it('uses the same intermediate reading text size for source and translation', async () => {
    const user = userEvent.setup();

    render(<EnglishAssistantClient />);

    const sourceInput = screen.getByRole('textbox', {
      name: 'Source Content',
    });
    await user.type(sourceInput, 'Hello there.');
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    expect(sourceInput).toHaveClass('text-2xl');
    expect(await screen.findByText('Xin chào')).toHaveClass('text-2xl');
  });

  it('does not open the dictionary lookup when selecting Vietnamese source text', async () => {
    const user = userEvent.setup();

    render(<EnglishAssistantClient />);

    await user.click(
      screen.getAllByRole('button', { name: 'Swap translation direction' })[0]
    );

    const sourceInput = screen.getByRole('textbox', {
      name: 'Source Content',
    }) as HTMLTextAreaElement;
    await user.type(sourceInput, 'hai người chơi');
    sourceInput.setSelectionRange(0, 3);
    fireEvent.mouseUp(sourceInput);

    expect(
      screen.queryByTestId('word-dictionary-popover')
    ).not.toBeInTheDocument();
  });

  it('shows a copied state after copying translated text', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(window.navigator.clipboard, 'writeText');

    render(<EnglishAssistantClient />);

    await user.type(
      screen.getByRole('textbox', { name: 'Source Content' }),
      'Hello there.'
    );
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    await screen.findByText('Xin chào');
    await user.click(screen.getByRole('button', { name: 'Copy translation' }));

    expect(writeText).toHaveBeenCalledWith('Xin chào');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
