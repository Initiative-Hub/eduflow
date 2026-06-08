import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { tavilySearch } from '@tavily/ai-sdk';
import { generateText, type LanguageModel, Output, stepCountIs } from 'ai';
import * as z from 'zod';

const webSearchSourceSchema = z.object({
  title: z.string().describe('The title of the source returned by web search.'),
  url: z.string().describe('The canonical URL of the source.'),
  summary: z
    .string()
    .describe(
      'A concise source summary or extracted content useful for course generation.'
    ),
  content: z
    .string()
    .describe(
      'The full raw text content extracted from the source, which may include key excerpts or relevant information for course generation.'
    ),
});

export type WebSearchContext = z.infer<typeof webSearchSourceSchema>[];

type SupplementarySearchInput = {
  model: LanguageModel;
  searchQuery: string;
  providerOptions?: ProviderOptions;
};

type SearchContextInput = SupplementarySearchInput & {
  purpose: 'web' | 'youtube';
};

export async function generateSupplementarySearchContexts({
  model,
  searchQuery,
  providerOptions,
}: SupplementarySearchInput) {
  const trimmedQuery = searchQuery.trim();

  const [webContext, youtubeContext] = await Promise.all([
    generateSearchContext({
      model,
      searchQuery: trimmedQuery,
      purpose: 'web',
      providerOptions,
    }),
    generateSearchContext({
      model,
      searchQuery: `${trimmedQuery} site:youtube.com`,
      purpose: 'youtube',
      providerOptions,
    }),
  ]);

  return { webContext, youtubeContext };
}

async function generateSearchContext({
  model,
  searchQuery,
  purpose,
  providerOptions,
}: SearchContextInput): Promise<WebSearchContext> {
  try {
    const result = await generateText({
      model,
      providerOptions,
      output: Output.array({ element: webSearchSourceSchema }),
      tools: {
        webSearch: tavilySearch({
          searchDepth: 'advanced',
          includeAnswer: true,
          includeRawContent: 'text',
          maxResults: 5,
          topic: 'general',
        }),
      },
      stopWhen: stepCountIs(3),
      system:
        'You turn Tavily search results into structured source context for an educational course generator. Preserve source titles, URLs, and useful source content.',
      prompt:
        purpose === 'web'
          ? `Search for current, reliable web context for this course topic. Return the most useful sources with title, url, and content fields.\n\nQuery: ${searchQuery}`
          : `Search for relevant YouTube videos for this course topic. Return only useful video sources with title, url, and content fields so a course generator can choose an embeddable lesson video.\n\nQuery: ${searchQuery}`,
    });

    console.log(`Generated ${purpose} context:`, result.output);

    return result.output;
  } catch (error) {
    console.error('Failed to execute AI SDK web search:', error);
    return [];
  }
}
