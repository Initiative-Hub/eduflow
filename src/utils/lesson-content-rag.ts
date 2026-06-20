import { createHash } from 'node:crypto';

export type LessonChunkMetadata = {
  headingPath?: string[];
};

export type LessonMarkdownChunk = {
  chunkIndex: number;
  markdown: string;
  tokenCount: number;
  metadata: LessonChunkMetadata;
};

export type LessonChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_CHUNK_OVERLAP = 100;
const RECURSIVE_SEPARATORS = ['\n\n', '\n', ' ', ''];
const WORD_PATTERN = /[\p{L}\p{N}_'-]+/gu;

export function normalizeLessonMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function estimateTokenCount(value: string): number {
  return [...value.matchAll(WORD_PATTERN)].length;
}

export function createLessonContentHash(markdown: string): string {
  return `sha256:${createHash('sha256')
    .update(normalizeLessonMarkdown(markdown))
    .digest('hex')}`;
}

/**
 * Parses ATX Markdown headings (`#` through `######`) from a single line.
 * Returns null for non-heading lines so fenced code and body text can pass
 * through unchanged.
 */
function getHeadingInfo(line: string) {
  const match = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
  if (!match) return null;

  return {
    level: match[1].length,
    title: match[2]
      .replace(/[ \t]+#+[ \t]*$/g, '')
      .replace(/\\([\\`*_{}[\]()#+>|])/g, '$1')
      .trim(),
  };
}

/**
 * Detects the opening marker for a fenced code block.
 * Markdown headings inside an active fence must not alter heading metadata.
 */
function getFenceMarker(line: string) {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(line);
  if (!match) return null;

  return {
    character: match[1][0],
    length: match[1].length,
  };
}

function closesFence(
  line: string,
  marker: { character: string; length: number }
) {
  const match = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
  return (
    Boolean(match) &&
    match?.[1][0] === marker.character &&
    match[1].length >= marker.length
  );
}

function createMetadata(headingPath: string[]): LessonChunkMetadata {
  // A lesson can start at `##`; compacting prevents sparse heading paths.
  const compactHeadingPath = headingPath.filter(Boolean);
  return compactHeadingPath.length > 0
    ? { headingPath: compactHeadingPath }
    : {};
}

/**
 * Performs the Markdown Header Chunking phase.
 * Each returned document represents text under the same heading path while
 * preserving the heading line in markdown (`strip_headers = false` behavior).
 */
function splitMarkdownByHeaders(markdown: string) {
  const documents: { markdown: string; metadata: LessonChunkMetadata }[] = [];
  const headingPath: string[] = [];
  let currentLines: string[] = [];
  let currentMetadata: LessonChunkMetadata = {};
  let fenceMarker: { character: string; length: number } | null = null;

  const flush = () => {
    const chunkMarkdown = normalizeLessonMarkdown(currentLines.join('\n'));
    if (!chunkMarkdown) return;

    documents.push({
      markdown: chunkMarkdown,
      metadata: currentMetadata,
    });
    currentLines = [];
  };

  for (const line of markdown.split('\n')) {
    if (fenceMarker) {
      currentLines.push(line);
      if (closesFence(line, fenceMarker)) {
        // Resume heading detection only after the matching fence closes.
        fenceMarker = null;
      }
      continue;
    }

    const nextFenceMarker = getFenceMarker(line);
    if (nextFenceMarker) {
      // Keep fenced code in the current document, but suspend heading parsing.
      fenceMarker = nextFenceMarker;
      currentLines.push(line);
      continue;
    }

    const headingInfo = getHeadingInfo(line);
    if (headingInfo) {
      // A real heading starts a new header document with fresh metadata.
      flush();
      headingPath.splice(headingInfo.level - 1);
      headingPath[headingInfo.level - 1] = headingInfo.title;
      currentMetadata = createMetadata(headingPath);
    }

    currentLines.push(line);
  }

  flush();

  return documents;
}

function getOverlapText(markdown: string, chunkOverlap: number): string {
  if (chunkOverlap <= 0) return '';

  return markdown.slice(-chunkOverlap).trimStart();
}

/**
 * Final recursive fallback for separator-free text.
 * This guarantees chunks can still respect chunkSize even for long continuous
 * strings such as minified text, long URLs, or code-like content.
 */
function splitByCharacterWindow(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  // Step by the non-overlapped span so adjacent windows share chunkOverlap chars.
  const stepSize = chunkSize - chunkOverlap;

  for (let index = 0; index < text.length; index += stepSize) {
    const chunk = normalizeLessonMarkdown(text.slice(index, index + chunkSize));
    if (chunk) {
      chunks.push(chunk);
    }

    if (index + chunkSize >= text.length) {
      break;
    }
  }

  return chunks;
}

function mergeSplits(
  splits: string[],
  separator: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let currentParts: string[] = [];

  const joinParts = (parts: string[]) =>
    normalizeLessonMarkdown(parts.join(separator));

  for (const split of splits) {
    if (!split) continue;

    const candidate = joinParts([...currentParts, split]);
    if (candidate.length <= chunkSize) {
      currentParts.push(split);
      continue;
    }

    const currentChunk = joinParts(currentParts);
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Carry only text from the current chunk, so overlap never crosses the
    // outer Markdown header document boundary.
    const overlapText = getOverlapText(currentChunk, chunkOverlap);
    const overlapCandidate = joinParts(
      overlapText ? [overlapText, split] : [split]
    );

    currentParts =
      overlapText && overlapCandidate.length <= chunkSize
        ? [overlapText, split]
        : [split];
  }

  const finalChunk = joinParts(currentParts);
  if (finalChunk) {
    chunks.push(finalChunk);
  }

  return chunks;
}

/**
 * Performs Recursive Character Chunking within a single Markdown header
 * document. It tries broad separators first, then progressively smaller ones,
 * matching the usual paragraph -> line -> word -> character fallback flow.
 */
function splitTextRecursively(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  separators = RECURSIVE_SEPARATORS
): string[] {
  const normalized = normalizeLessonMarkdown(text);
  if (!normalized) return [];
  if (normalized.length <= chunkSize) return [normalized];

  const [separator = ''] = separators;
  const remainingSeparators = separators.slice(1);

  if (separator === '') {
    // Empty separator means no semantic boundary could split the text enough.
    return splitByCharacterWindow(normalized, chunkSize, chunkOverlap);
  }

  const rawSplits = normalized.split(separator);
  const chunks: string[] = [];
  let mergeableSplits: string[] = [];

  const flushMergeable = () => {
    chunks.push(
      ...mergeSplits(mergeableSplits, separator, chunkSize, chunkOverlap)
    );
    mergeableSplits = [];
  };

  for (const split of rawSplits) {
    if (!split) continue;

    if (split.length > chunkSize) {
      // Preserve already-mergeable text before recursing into the oversized bit.
      flushMergeable();
      chunks.push(
        ...splitTextRecursively(
          split,
          chunkSize,
          chunkOverlap,
          remainingSeparators
        )
      );
      continue;
    }

    mergeableSplits.push(split);
  }

  flushMergeable();

  return chunks;
}

export function chunkLessonMarkdown(
  markdown: string,
  options: LessonChunkOptions = {}
): LessonMarkdownChunk[] {
  const normalized = normalizeLessonMarkdown(markdown);
  if (!normalized) return [];

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('chunkSize must be a positive integer');
  }

  if (!Number.isInteger(chunkOverlap) || chunkOverlap < 0) {
    throw new Error('chunkOverlap must be a non-negative integer');
  }

  if (chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be smaller than chunkSize');
  }

  const markdownDocuments = splitMarkdownByHeaders(normalized);
  const chunks: LessonMarkdownChunk[] = [];

  for (const document of markdownDocuments) {
    // Header documents are split independently so overlap cannot leak across unrelated sections.
    const chunkMarkdowns = splitTextRecursively(
      document.markdown,
      chunkSize,
      chunkOverlap
    );

    for (const chunkMarkdown of chunkMarkdowns) {
      chunks.push({
        chunkIndex: chunks.length,
        markdown: chunkMarkdown,
        tokenCount: estimateTokenCount(chunkMarkdown),
        metadata: document.metadata,
      });
    }
  }

  return chunks;
}

export function vectorToSqlLiteral(embedding: number[]): string {
  const values = embedding.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error('Embedding contains a non-finite number');
    }

    return Number(value).toString();
  });

  return `[${values.join(',')}]`;
}
