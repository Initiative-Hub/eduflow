import type { UIMessage } from 'ai';

export interface ChatCitationSource {
  index: number;
  url: string;
  title?: string;
  description?: string;
}

const CITATION_MARKER_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

function getSearchResults(output: unknown): unknown[] {
  if (!isRecord(output) || !Array.isArray(output.results)) return [];

  return output.results;
}

function formatMarkdownTitle(title?: string) {
  if (!title) return '';

  return ` "${title.replaceAll('"', '\\"')}"`;
}

function addSource(
  sources: ChatCitationSource[],
  seenUrls: Set<string>,
  source: Omit<ChatCitationSource, 'index'>
) {
  const url = source.url.trim();
  if (!url || seenUrls.has(url)) return;

  seenUrls.add(url);
  sources.push({
    ...source,
    index: sources.length + 1,
    url,
  });
}

export function getCitationSources(
  parts: UIMessage['parts']
): ChatCitationSource[] {
  const sources: ChatCitationSource[] = [];
  const seenUrls = new Set<string>();

  for (const part of parts) {
    if (part.type === 'source-url') {
      addSource(sources, seenUrls, {
        title: part.title,
        url: part.url,
      });
      continue;
    }

    if (!part.type.startsWith('tool-')) continue;
    if (!('state' in part) || part.state !== 'output-available') continue;
    if (!('output' in part)) continue;

    for (const result of getSearchResults(part.output)) {
      if (!isRecord(result)) continue;

      const url = asString(result.url);
      if (!url) continue;

      addSource(sources, seenUrls, {
        description: asString(result.content) ?? asString(result.snippet),
        title: asString(result.title),
        url,
      });
    }
  }

  return sources;
}

export function buildInlineCitationMarkdown(
  markdown: string,
  sources: ChatCitationSource[]
): string {
  if (sources.length === 0) return markdown;

  const sourcesByIndex = new Map(
    sources.map((source) => [source.index, source] as const)
  );

  return markdown.replace(CITATION_MARKER_PATTERN, (marker, group: string) => {
    let hasCitationLink = false;
    const replacements = group.split(',').map((rawIndex) => {
      const index = Number.parseInt(rawIndex.trim(), 10);
      const source = sourcesByIndex.get(index);

      if (!source) return `[${index}]`;

      hasCitationLink = true;
      return `[[${index}]](${source.url}${formatMarkdownTitle(source.title)})`;
    });

    if (!hasCitationLink) return marker;

    return replacements.join(' ');
  });
}
