import { describe, expect, it } from 'vitest';
import { tiptapDocumentToMarkdown } from '@/lib/tiptap-markdown';
import type { TiptapDocument } from '@/utils/lesson-content';
import {
  chunkLessonMarkdown,
  createLessonContentHash,
} from '@/utils/lesson-content-rag';

describe('lesson content RAG helpers', () => {
  it('converts Tiptap JSON into semantic Markdown for indexing', () => {
    const document: TiptapDocument = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Cell Biology' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Cells use ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'ATP' },
            { type: 'text', text: ' for energy.' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Mitochondria' }],
                },
              ],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const energy = "ATP";' }],
        },
      ],
    };

    expect(tiptapDocumentToMarkdown(document)).toBe(
      [
        '## Cell Biology',
        '',
        'Cells use **ATP** for energy.',
        '',
        '- Mitochondria',
        '',
        '```ts',
        'const energy = "ATP";',
        '```',
      ].join('\n')
    );
  });

  it('splits Markdown by headers before recursive character chunking', () => {
    const markdown = [
      'Opening context before the first heading.',
      '',
      '# Photosynthesis',
      '',
      'Plants convert light into chemical energy.',
      '',
      '## Chloroplasts',
      '',
      'Chloroplasts contain chlorophyll and support light reactions.',
    ].join('\n');

    const chunks = chunkLessonMarkdown(markdown, {
      chunkSize: 500,
      chunkOverlap: 0,
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      markdown: 'Opening context before the first heading.',
      metadata: {},
    });
    expect(chunks[1]).toMatchObject({
      chunkIndex: 1,
      metadata: { headingPath: ['Photosynthesis'] },
    });
    expect(chunks[1]?.markdown).toContain('# Photosynthesis');
    expect(chunks[2]).toMatchObject({
      chunkIndex: 2,
      metadata: { headingPath: ['Photosynthesis', 'Chloroplasts'] },
    });
    expect(chunks[2]?.markdown).toContain('## Chloroplasts');
  });

  it('recursively splits oversized header sections with section metadata', () => {
    const markdown = [
      '# Long Section',
      '',
      'Alpha paragraph introduces the first idea with enough words to require splitting.',
      '',
      'Beta paragraph keeps related supporting evidence together when possible.',
      '',
      'Gamma paragraph closes the section with one more distinct idea.',
    ].join('\n');

    const chunks = chunkLessonMarkdown(markdown, {
      chunkSize: 90,
      chunkOverlap: 18,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.markdown.length <= 90)).toBe(true);
    expect(chunks.map((chunk) => chunk.metadata)).toEqual(
      chunks.map(() => ({ headingPath: ['Long Section'] }))
    );
    expect(chunks.at(-1)?.markdown).toContain('Gamma paragraph');
  });

  it('keeps recursive overlap inside the current Markdown header group', () => {
    const markdown = [
      '# First',
      '',
      'first-overlap-marker alpha beta gamma delta epsilon zeta eta theta.',
      '',
      '# Second',
      '',
      'second-only-content alpha beta gamma delta epsilon zeta eta theta iota.',
    ].join('\n');

    const chunks = chunkLessonMarkdown(markdown, {
      chunkSize: 55,
      chunkOverlap: 25,
    });

    const secondChunks = chunks.filter(
      (chunk) => chunk.metadata.headingPath?.[0] === 'Second'
    );

    expect(secondChunks.length).toBeGreaterThan(0);
    expect(
      secondChunks.every((chunk) => chunk.markdown.includes('Second'))
    ).toBe(false);
    expect(
      secondChunks.every(
        (chunk) => !chunk.markdown.includes('first-overlap-marker')
      )
    ).toBe(true);
  });

  it('ignores Markdown-looking headings inside fenced code blocks', () => {
    const markdown = [
      '# Actual Heading',
      '',
      '```md',
      '# Not A Heading',
      '```',
      '',
      'The real section continues after the code sample.',
    ].join('\n');

    const chunks = chunkLessonMarkdown(markdown, {
      chunkSize: 500,
      chunkOverlap: 0,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      metadata: { headingPath: ['Actual Heading'] },
    });
    expect(chunks[0]?.markdown).toContain('# Not A Heading');
  });

  it('stores heading paths without gaps when Markdown starts at a deeper heading', () => {
    const chunks = chunkLessonMarkdown('## Cell Biology\n\nCells use ATP.', {
      chunkSize: 500,
      chunkOverlap: 0,
    });

    expect(chunks[0]?.metadata).toEqual({
      headingPath: ['Cell Biology'],
    });
  });

  it('uses character overlap when recursive splitting falls back to fixed windows', () => {
    const chunks = chunkLessonMarkdown('# Codes\n\nabcdefghijklmnopqrstuv', {
      chunkOverlap: 3,
      chunkSize: 10,
    });

    expect(chunks.map((chunk) => chunk.markdown)).toContain('abcdefghij');
    expect(chunks.map((chunk) => chunk.markdown)).toContain('hijklmnopq');
  });

  it('rejects invalid recursive character chunk options', () => {
    expect(() =>
      chunkLessonMarkdown('# Lesson', { chunkSize: 0 })
    ).toThrowError('chunkSize must be a positive integer');
    expect(() =>
      chunkLessonMarkdown('# Lesson', {
        chunkOverlap: 100,
        chunkSize: 100,
      })
    ).toThrowError('chunkOverlap must be smaller than chunkSize');
  });

  it('returns no chunks for empty Markdown', () => {
    expect(chunkLessonMarkdown(' \n\n\t ')).toEqual([]);
  });

  it('keeps estimated token counts on stored chunks', () => {
    const chunks = chunkLessonMarkdown('# Lesson\n\nStored lesson content.', {
      chunkSize: 500,
      chunkOverlap: 0,
    });

    expect(chunks[0]?.tokenCount).toBe(4);
  });

  it('creates stable hashes from normalized Markdown', () => {
    expect(createLessonContentHash('  # Lesson\n\nBody  ')).toBe(
      createLessonContentHash('# Lesson\n\nBody')
    );
  });
});
