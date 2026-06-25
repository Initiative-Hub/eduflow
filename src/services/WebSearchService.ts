import { tavilySearch } from '@tavily/ai-sdk';

export class WebSearchService {
  /**
   * Executes a web search query using the Tavily search tool.
   * @param query The search query string.
   * @returns The search results response from Tavily.
   */
  static async search(query: string): Promise<any> {
    const searchTool = tavilySearch({ maxResults: 3 });
    if (!searchTool.execute) {
      throw new Error('Tavily search execution method is undefined');
    }

    return searchTool.execute(
      { query },
      {
        toolCallId: `websearch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        messages: [],
      }
    );
  }
}
