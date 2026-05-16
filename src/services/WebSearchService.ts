import { z } from 'zod';
import { searchWebClient } from '@/utils/search-web-client';

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  rawContent?: string;
  favicon?: string;
}

export const WebSearchService = {
  searchSchema: z.object({
    query: z
      .string()
      .min(1, 'Search query cannot be empty')
      .describe('The search query'),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe('Maximum number of results'),
    includeAnswer: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include answer in the response'),
  }),

  /**
   * Executes a web search and returns a list of results.
   */
  async search(
    query: string,
    maxResults: number = 5,
    includeAnswer: boolean = true
  ): Promise<string> {
    try {
      // Validate inputs using the schema
      this.searchSchema.parse({ query, maxResults, includeAnswer });

      const response = await searchWebClient.search(query, {
        searchDepth: 'advanced',
        maxResults: maxResults,
        includeAnswer: includeAnswer,
        includeRawContent: 'text',
      });

      return this.formatResultsForLLM(response?.results || []);
    } catch (error) {
      console.error('Failed to execute web search:', error);
      // Fallback gracefully to an empty string context
      return "No web results could be retrieved due to an error.";
    }
  },

  /**
   * Formats raw search results into a clean, markdown-style string
   * specifically optimized for LLM context injection.
   */
  formatResultsForLLM(results: SearchResult[]): string {
    if (!results || results.length === 0) {
      return 'No external web context found.';
    }

    return results
      .map((result, index) => {
        // Fall back to rawContent if the search engine extracted full text, otherwise use snippet content
        const bodyText = result.rawContent || result.content;
        return `[Source ${index + 1}] Title: ${result.title}\nURL: ${result.url}\nContent:\n${bodyText}\n---`;
      })
      .join('\n\n');
  },
};

// Inferred type for type safety elsewhere in your application
export type WebSearchInput = z.infer<typeof WebSearchService.searchSchema>;
