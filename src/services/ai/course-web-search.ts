import { tavilySearch } from '@tavily/ai-sdk';
import { isStepCount, type LanguageModel, Output, streamText } from 'ai';
import * as z from 'zod';
import type {
  CourseContentSearchSourceKind,
  CourseContentSearchSourcePreview,
} from '@/types/course-content-stream-event';

const webSearchSourceSchema = z.object({
  title: z.string().describe('The title of the source returned by web search.'),
  url: z.string().describe('The canonical URL of the source.'),
  summary: z
    .string()
    .describe(
      'A concise source summary or extracted content useful for course content generation.'
    ),
  content: z
    .string()
    .describe(
      'The full raw text content extracted from the source, which may include key excerpts or relevant information for course content generation.'
    ),
});

export type WebSearchContext = z.infer<typeof webSearchSourceSchema>[];

type SourceFoundEvent = {
  sourceKind: CourseContentSearchSourceKind;
  source: CourseContentSearchSourcePreview;
};

type SearchCompleteEvent = {
  sourceKind: CourseContentSearchSourceKind;
  count: number;
};

type SupplementarySearchInput = {
  model: LanguageModel;
  searchQuery: string;
  onSource?: (event: SourceFoundEvent) => Promise<void> | void;
  onSearchComplete?: (event: SearchCompleteEvent) => Promise<void> | void;
};

type SearchContextInput = SupplementarySearchInput & {
  purpose: CourseContentSearchSourceKind;
};

export async function generateSupplementarySearchContexts({
  model,
  searchQuery,
  onSource,
  onSearchComplete,
}: SupplementarySearchInput) {
  const trimmedQuery = searchQuery.trim();

  const [webContext, youtubeContext] = await Promise.all([
    generateSearchContext({
      model,
      searchQuery: trimmedQuery,
      purpose: 'web',
      onSource,
      onSearchComplete,
    }),
    generateSearchContext({
      model,
      searchQuery: `${trimmedQuery} site:youtube.com`,
      purpose: 'youtube',
      onSource,
      onSearchComplete,
    }),
  ]);

  return { webContext, youtubeContext };
}

async function generateSearchContext({
  model,
  searchQuery,
  purpose,
  onSource,
  onSearchComplete,
}: SearchContextInput): Promise<WebSearchContext> {
  try {
    const result = streamText({
      model,
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
      stopWhen: isStepCount(3),
      instructions:
        'You turn Tavily search results into structured source context for an educational course generator. Preserve source titles, URLs, and useful source content.',
      prompt:
        purpose === 'web'
          ? `Search for current, reliable web context for this course topic. Return the most useful sources with title, url, summary, and content fields.\n\nQuery: ${searchQuery}`
          : `Search for relevant YouTube videos for this course topic. Return only useful video sources with title, url, summary, and content fields so a course generator can choose an embeddable lesson video.\n\nQuery: ${searchQuery}`,
    });

    const outputPromise = result.output;
    let streamedCount = 0;

    for await (const source of result.elementStream) {
      streamedCount += 1;
      await onSource?.({
        sourceKind: purpose,
        source: toSearchSourcePreview(source),
      });
    }

    const output = await outputPromise;
    await onSearchComplete?.({
      sourceKind: purpose,
      count: output.length || streamedCount,
    });

    console.log(`Generated ${purpose} context:`, output);

    return output;
  } catch (error) {
    console.error('Failed to execute AI SDK web search:', error);
    await onSearchComplete?.({ sourceKind: purpose, count: 0 });
    return [];
  }
}

function toSearchSourcePreview(
  source: z.infer<typeof webSearchSourceSchema>
): CourseContentSearchSourcePreview {
  return {
    title: source.title,
    url: source.url,
    summary: source.summary,
  };
}
