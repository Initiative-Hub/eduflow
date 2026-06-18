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

  it('chunks Markdown while carrying heading metadata', () => {
    const markdown = [
      '# Photosynthesis',
      '',
      'Plants convert light into chemical energy.',
      '',
      '## Chloroplasts',
      '',
      'Chloroplasts contain chlorophyll and support light reactions.',
    ].join('\n');

    const chunks = chunkLessonMarkdown(markdown, {
      targetTokenCount: 7,
      overlapTokenCount: 2,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      metadata: { headingPath: ['Photosynthesis'] },
    });
    expect(chunks.at(-1)?.metadata).toEqual({
      headingPath: ['Photosynthesis', 'Chloroplasts'],
    });
  });

  it('creates stable hashes from normalized Markdown', () => {
    expect(createLessonContentHash('  # Lesson\n\nBody  ')).toBe(
      createLessonContentHash('# Lesson\n\nBody')
    );
  });
});
