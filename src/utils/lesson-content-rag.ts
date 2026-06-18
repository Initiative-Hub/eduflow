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
  targetTokenCount?: number;
  overlapTokenCount?: number;
};

const DEFAULT_TARGET_TOKEN_COUNT = 800;
const DEFAULT_OVERLAP_TOKEN_COUNT = 100;
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

function getHeadingInfo(block: string) {
  const match = /^(#{1,6})\s+(.+)$/.exec(block.trim());
  if (!match) return null;

  return {
    level: match[1].length,
    title: match[2].replace(/\\([\\`*_{}\[\]()#+>|])/g, '$1').trim(),
  };
}

function getOverlapText(markdown: string, overlapTokenCount: number): string {
  if (overlapTokenCount <= 0) return '';

  const words = [...markdown.matchAll(WORD_PATTERN)].map((match) => match[0]);
  return words.slice(-overlapTokenCount).join(' ');
}

export function chunkLessonMarkdown(
  markdown: string,
  options: LessonChunkOptions = {}
): LessonMarkdownChunk[] {
  const normalized = normalizeLessonMarkdown(markdown);
  if (!normalized) return [];

  const targetTokenCount =
    options.targetTokenCount ?? DEFAULT_TARGET_TOKEN_COUNT;
  const overlapTokenCount =
    options.overlapTokenCount ?? DEFAULT_OVERLAP_TOKEN_COUNT;
  const blocks = normalized.split(/\n{2,}/);
  const chunks: LessonMarkdownChunk[] = [];
  const headingPath: string[] = [];
  let currentBlocks: string[] = [];
  let currentTokenCount = 0;
  let currentMetadata: LessonChunkMetadata = {};

  const flush = () => {
    const chunkMarkdown = normalizeLessonMarkdown(currentBlocks.join('\n\n'));
    if (!chunkMarkdown) return;

    chunks.push({
      chunkIndex: chunks.length,
      markdown: chunkMarkdown,
      tokenCount: estimateTokenCount(chunkMarkdown),
      metadata: currentMetadata,
    });

    const overlapText = getOverlapText(chunkMarkdown, overlapTokenCount);
    currentBlocks = overlapText ? [overlapText] : [];
    currentTokenCount = overlapText ? estimateTokenCount(overlapText) : 0;
  };

  for (const block of blocks) {
    const headingInfo = getHeadingInfo(block);
    if (headingInfo) {
      headingPath.splice(headingInfo.level - 1);
      headingPath[headingInfo.level - 1] = headingInfo.title;
    }

    const nextMetadata =
      headingPath.length > 0 ? { headingPath: [...headingPath] } : {};
    const blockTokenCount = estimateTokenCount(block);

    if (
      currentBlocks.length > 0 &&
      currentTokenCount + blockTokenCount > targetTokenCount
    ) {
      flush();
    }

    currentBlocks.push(block);
    currentTokenCount += blockTokenCount;
    currentMetadata = nextMetadata;
  }

  flush();

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
