import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnglishAssistantClient } from '@/app/[locale]/(dashboard)/english/_components/english-assistant-client';

const apiClient = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

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
  emptyAnalyzedState: 'No key vocabulary found in this text.',
  emptyState: 'No vocabulary items yet.',
  english: 'English',
  exportPdf: 'Export PDF',
  hoverLookupHint: 'Hover a word to look it up.',
  inputPlaceholder: 'Paste or type your English text here...',
  pageSubtitle: 'English study tools',
  saveToLibrary: 'Save to Library',
  shareTooltip: 'Share',
  sentencesEmptyState: 'No grammar analysis yet.',
  sentencesTitle: 'Grammar Analysis',
  sourceContent: 'Source Content',
  swapDirection: 'Swap translation direction',
  title: 'Key Vocabulary',
  translateAndAnalyze: 'Translate & Analyze',
  translationPlaceholder: 'Translation will appear here after analysis...',
  vietnamese: 'Vietnamese',
  words: 'words',
  wordbank: 'Wordbank',
  wordbankLinkLabel: 'Wordbank {count}',
  wordbankCount: '{count} words',
  saveAllToWordbank: 'Save all to Wordbank ({count})',
  saveToWordbank: 'Save {word} to Wordbank',
  removeFromWordbank: 'Remove {word} from Wordbank',
  wordbankSavedToast: 'Saved to Wordbank',
  wordbankRemovedToast: 'Removed from Wordbank',
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
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) => {
      let message = messages[key] ?? key;
      for (const [name, value] of Object.entries(values ?? {})) {
        message = message.replaceAll(`{${name}}`, String(value));
      }
      return message;
    },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient,
}));

vi.mock('@/components/english/grammar-analysis-dialog', () => ({
  GrammarAnalysisDialog: () => null,
}));

vi.mock('@/components/dictionary/dictionary-enabled-editor', () => ({
  DictionaryEnabledEditor: ({
    value,
    onChange,
    onWordLookup,
    ariaLabel,
    placeholder,
    className,
    language,
  }: {
    value: string;
    onChange: (value: string) => void;
    onWordLookup: (
      word: string,
      anchor: { getBoundingClientRect: () => DOMRect }
    ) => void;
    ariaLabel?: string;
    placeholder?: string;
    className?: string;
    language?: 'en' | 'vi';
  }) => (
    <textarea
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      onMouseUp={(event) => {
        if (language !== 'en') return;

        const selectedText = event.currentTarget.value
          .slice(
            event.currentTarget.selectionStart,
            event.currentTarget.selectionEnd
          )
          .trim();
        if (!selectedText) return;

        onWordLookup(selectedText, {
          getBoundingClientRect: () => new DOMRect(),
        });
      }}
    />
  ),
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

function renderEnglishAssistantClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EnglishAssistantClient />
    </QueryClientProvider>
  );
}

describe('EnglishAssistantClient', () => {
  const clipboardWriteText = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    clipboardWriteText.mockClear();
    apiClient.delete.mockReset();
    apiClient.get.mockReset();
    apiClient.patch.mockReset();
    apiClient.post.mockReset();
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
    });

    let savedWordbankWords: string[] = [];

    apiClient.get.mockImplementation(async (url: string) => {
      if (url === 'v1/english/wordbank') {
        return {
          items: [],
          lists: [],
          savedWords: savedWordbankWords,
          stats: {
            dueWords: 0,
            familiarWords: 0,
            masteredWords: 0,
            newWords: 0,
            savedToday: 0,
            savedWords: savedWordbankWords.length,
          },
          total: savedWordbankWords.length,
        };
      }

      return {};
    });

    apiClient.post.mockImplementation(async (url: string) => {
      if (url === 'v1/english/wordbank') {
        savedWordbankWords = ['hello'];
        return {
          savedCount: 1,
          savedWords: savedWordbankWords,
          total: savedWordbankWords.length,
        };
      }

      return {};
    });

    apiClient.delete.mockImplementation(async (url: string) => {
      if (url === 'v1/english/wordbank') {
        savedWordbankWords = [];
        return {
          removedCount: 1,
          savedWords: savedWordbankWords,
          total: savedWordbankWords.length,
        };
      }

      return {};
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes('/api/v1/english/wordbank')) {
          if (init?.method === 'POST') {
            savedWordbankWords = ['hello'];
            return new Response(
              JSON.stringify({
                savedCount: 1,
                total: savedWordbankWords.length,
                savedWords: savedWordbankWords,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          if (init?.method === 'DELETE') {
            savedWordbankWords = [];
            return new Response(
              JSON.stringify({
                removedCount: 1,
                total: savedWordbankWords.length,
                savedWords: savedWordbankWords,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          return new Response(
            JSON.stringify({
              items: [],
              total: savedWordbankWords.length,
              savedWords: savedWordbankWords,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

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

    renderEnglishAssistantClient();

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

    renderEnglishAssistantClient();

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

  it('uses the same compact reading text size for source and translation', async () => {
    const user = userEvent.setup();

    renderEnglishAssistantClient();

    const sourceInput = screen.getByRole('textbox', {
      name: 'Source Content',
    });
    await user.type(sourceInput, 'Hello there.');
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    expect(sourceInput).toHaveClass('text-lg');
    expect(await screen.findByText('Xin chào')).toHaveClass('text-lg');
  });

  it('shows the grammar analysis section before content is analyzed', () => {
    renderEnglishAssistantClient();

    expect(
      screen.getByRole('heading', { name: 'Grammar Analysis' })
    ).toBeInTheDocument();
    expect(screen.getByText('No grammar analysis yet.')).toBeInTheDocument();
  });

  it('shows a completed-analysis empty state when no key vocabulary is found', async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/api/v1/english/translate')) {
          return new Response(
            JSON.stringify({
              translatedText: 'xxGrammarAnalysisDialogProps',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        if (url.includes('/api/v1/english/analyze')) {
          return new Response(
            JSON.stringify({
              vocabulary: [],
              sentences: ['xxGrammarAnalysisDialogProps'],
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

    renderEnglishAssistantClient();

    await user.type(
      screen.getByRole('textbox', { name: 'Source Content' }),
      'xxGrammarAnalysisDialogProps'
    );
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    expect(
      await screen.findByText('No key vocabulary found in this text.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No vocabulary items yet.')
    ).not.toBeInTheDocument();
  });

  it('does not open the dictionary lookup when selecting Vietnamese source text', async () => {
    const user = userEvent.setup();

    renderEnglishAssistantClient();

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

    renderEnglishAssistantClient();

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

  it('saves analyzed vocabulary to the wordbank from the sticky action', async () => {
    const user = userEvent.setup();

    renderEnglishAssistantClient();

    await user.type(
      screen.getByRole('textbox', { name: 'Source Content' }),
      'Hello there.'
    );
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    await screen.findByText('hello');
    await user.click(
      screen.getByRole('button', { name: 'Save all to Wordbank (1)' })
    );

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('v1/english/wordbank', {
        vocabulary: [expect.objectContaining({ word: 'hello' })],
      });
    });
  });

  it('updates the English assistant wordbank count from the save response before refetch settles', async () => {
    const user = userEvent.setup();
    let listRequestCount = 0;

    apiClient.get.mockImplementation(async (url: string) => {
      if (url === 'v1/english/wordbank') {
        listRequestCount += 1;

        if (listRequestCount > 1) {
          return new Promise(() => {});
        }

        return {
          items: [],
          lists: [],
          savedWords: [],
          stats: {
            dueWords: 0,
            familiarWords: 0,
            masteredWords: 0,
            newWords: 0,
            savedToday: 0,
            savedWords: 0,
          },
          total: 0,
        };
      }

      return {};
    });
    apiClient.post.mockImplementation(async (url: string) => {
      if (url === 'v1/english/wordbank') {
        return {
          savedCount: 1,
          savedWords: ['hello'],
          total: 1,
        };
      }

      return {};
    });

    renderEnglishAssistantClient();

    await user.type(
      screen.getByRole('textbox', { name: 'Source Content' }),
      'Hello there.'
    );
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    await screen.findByText('hello');
    await user.click(
      screen.getByRole('button', { name: 'Save all to Wordbank (1)' })
    );

    expect(
      await screen.findByRole('link', { name: 'Wordbank 1' })
    ).toBeInTheDocument();
  });

  it('centers vocabulary rows and keeps wordbank bookmark actions borderless', async () => {
    const user = userEvent.setup();

    renderEnglishAssistantClient();

    await user.type(
      screen.getByRole('textbox', { name: 'Source Content' }),
      'Hello there.'
    );
    await user.click(
      screen.getByRole('button', { name: 'Translate & Analyze' })
    );

    const vocabularyWord = await screen.findByText('hello');
    let vocabularyRow: HTMLElement | null = vocabularyWord;
    while (vocabularyRow && !vocabularyRow.className.includes('lg:grid-cols')) {
      vocabularyRow = vocabularyRow.parentElement;
    }

    expect(vocabularyRow).toHaveClass('items-center', 'lg:items-center');
    expect(vocabularyRow).not.toHaveClass('lg:items-start');

    const saveButton = screen.getByRole('button', {
      name: 'Save hello to Wordbank',
    });
    expect(saveButton).toHaveClass('hover:bg-primary/10', 'hover:text-primary');
    expect(saveButton).not.toHaveClass('border', 'rounded-full');

    await user.click(saveButton);

    const removeButton = await screen.findByRole('button', {
      name: 'Remove hello from Wordbank',
    });
    expect(removeButton).toHaveClass('text-destructive', 'hover:bg-muted/60');
    expect(removeButton).not.toHaveClass('border', 'rounded-full');
  });
});
