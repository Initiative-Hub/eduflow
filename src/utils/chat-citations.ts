import type { UIMessage } from 'ai';

export interface ChatCitationSource {
  index: number;
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
}

const CITATION_MARKER_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;
const CITATION_RUN_PATTERN =
  /\[(?:\d+(?:\s*,\s*\d+)*)\](?!\()(?:\s*,?\s*\[(?:\d+(?:\s*,\s*\d+)*)\](?!\())*/g;
const CITATION_LINK_PREFIX = '#citation-';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

function getDefaultFaviconUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

function getSearchResults(output: unknown): unknown[] {
  if (!isRecord(output) || !Array.isArray(output.results)) return [];

  return output.results;
}

function formatMarkdownTitle(title?: string) {
  if (!title) return '';

  return ` "${title.replaceAll('"', '\\"')}"`;
}

function parseCitationIndices(value: string): number[] {
  const normalized = value.trim().replace(/^\[/, '').replace(/\]$/, '');

  return normalized
    .split(',')
    .map((rawIndex) => Number.parseInt(rawIndex.trim(), 10))
    .filter(Number.isFinite);
}

function parseCitationRun(value: string): number[] {
  const seenIndices = new Set<number>();
  const indices: number[] = [];
  const markers = value.match(CITATION_MARKER_PATTERN) ?? [];

  for (const marker of markers) {
    for (const index of parseCitationIndices(marker)) {
      if (seenIndices.has(index)) continue;

      seenIndices.add(index);
      indices.push(index);
    }
  }

  return indices;
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

    const output = part.output;

    // ── Lesson content chunks from searchLessonContent tool ──────────────────
    if (part.type === 'tool-searchLessonContent') {
      for (const result of getSearchResults(output)) {
        if (!isRecord(result)) continue;

        const url = asString(result.url);
        if (!url) continue;

        addSource(sources, seenUrls, {
          title: asString(result.lessonTitle),
          description: asString(result.excerpt),
          url,
        });
      }

      continue;
    }

    // ── Generic web-search tool results (existing behaviour) ─────────────────
    for (const result of getSearchResults(output)) {
      if (!isRecord(result)) continue;

      const url = asString(result.url);
      if (!url) continue;

      addSource(sources, seenUrls, {
        description: asString(result.content) ?? asString(result.snippet),
        favicon: asString(result.favicon) ?? getDefaultFaviconUrl(url),
        title: asString(result.title),
        url,
      });
    }
  }

  return sources;
}

export function getCitationSourceGroup(
  citationText: string,
  sources: ChatCitationSource[]
): ChatCitationSource[] {
  const sourcesByIndex = new Map(
    sources.map((source) => [source.index, source] as const)
  );

  return parseCitationIndices(citationText).flatMap((index) => {
    const source = sourcesByIndex.get(index);
    return source ? [source] : [];
  });
}

export function buildInlineCitationMarkdown(
  markdown: string,
  sources: ChatCitationSource[]
): string {
  if (sources.length === 0) return markdown;

  const sourcesByIndex = new Map(
    sources.map((source) => [source.index, source] as const)
  );

  return markdown.replace(CITATION_RUN_PATTERN, (marker) => {
    const citationIndices = parseCitationRun(marker);
    const citationSources = citationIndices.flatMap((index) => {
      const source = sourcesByIndex.get(index);
      return source ? [source] : [];
    });

    if (
      citationSources.length === 0 ||
      citationSources.length !== citationIndices.length
    ) {
      return marker;
    }

    const label = citationSources.map((source) => source.index).join(', ');
    const href = `${CITATION_LINK_PREFIX}${citationSources
      .map((source) => source.index)
      .join('-')}`;
    const firstSource = citationSources[0];

    return `[[${label}]](${href}${formatMarkdownTitle(firstSource?.title)})`;
  });
}
