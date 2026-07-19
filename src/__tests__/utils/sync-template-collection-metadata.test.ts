import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { syncCollectionManifest } from '../../../scripts/sync-template-collection-metadata.mjs';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});

describe('sync-template-collection-metadata', () => {
  it('creates a missing collection manifest and embeds category guidance from category files', () => {
    const root = mkdtempSync(join(tmpdir(), 'template-collection-'));
    tempDirs.push(root);

    const collectionDir = join(root, 'pastel_pop');
    const agendaDir = join(collectionDir, 'AGENDA_OUTLINE');
    mkdirSync(agendaDir, { recursive: true });

    writeFileSync(
      join(agendaDir, 'category.json'),
      JSON.stringify(
        {
          description:
            'Agenda slide that previews the main sections of the presentation.',
          when_to_use: 'Use near the start of the deck after the title slide.',
          prompt_hint:
            'Use to preview the real parts of the talk. Fill with short section labels only, and include only topics that later slides actually cover.',
          content_guidance: [
            'List concise section names, not full explanations.',
            'Match the number of agenda items to the available slide count.',
            'Every agenda item should map to at least one later content slide.',
          ],
          variants: {
            standard: 'Agenda layout',
          },
        },
        null,
        2
      )
    );

    syncCollectionManifest(collectionDir);

    const manifest = JSON.parse(
      readFileSync(join(collectionDir, 'collection.json'), 'utf8')
    );

    expect(manifest.name).toBe('pastel_pop');
    expect(manifest.description).toBe(
      'Soft pastel style: blush background, white cards, rose pink and mint accents, friendly rounded feel.'
    );
    expect(manifest.categories).toEqual({
      AGENDA_OUTLINE: {
        description:
          'Agenda slide that previews the main sections of the presentation.',
        when_to_use: 'Use near the start of the deck after the title slide.',
        prompt_hint:
          'Use to preview the real parts of the talk. Fill with short section labels only, and include only topics that later slides actually cover.',
        content_guidance: [
          'List concise section names, not full explanations.',
          'Match the number of agenda items to the available slide count.',
          'Every agenda item should map to at least one later content slide.',
        ],
      },
    });
  });

  it('backfills missing category guidance from shared fallbacks', () => {
    const root = mkdtempSync(join(tmpdir(), 'template-collection-'));
    tempDirs.push(root);

    const collectionDir = join(root, 'clean_light');
    const galleryDir = join(collectionDir, 'IMAGE_GALLERY');
    mkdirSync(galleryDir, { recursive: true });

    writeFileSync(
      join(galleryDir, 'category.json'),
      JSON.stringify(
        {
          description:
            "THE layout for a section that lists exactly THREE parallel items, types, services, options, or categories — each item gets its own image panel with a label and one-line caption. Strongly prefer this over a plain bullet list whenever a section presents exactly 3 distinct things that can each be pictured (e.g. '3 types of X', '3 options', '3 categories').",
        },
        null,
        2
      )
    );

    syncCollectionManifest(collectionDir);

    const manifest = JSON.parse(
      readFileSync(join(collectionDir, 'collection.json'), 'utf8')
    );

    expect(manifest.categories.IMAGE_GALLERY).toEqual({
      description:
        "THE layout for a section that lists exactly THREE parallel items, types, services, options, or categories — each item gets its own image panel with a label and one-line caption. Strongly prefer this over a plain bullet list whenever a section presents exactly 3 distinct things that can each be pictured (e.g. '3 types of X', '3 options', '3 categories').",
      when_to_use:
        'Use when the presentation needs to compare exactly three visual categories, options, examples, or items in parallel.',
      prompt_hint:
        'Use for exactly 3 items that each benefit from an image. Fill each card with a short label, one-line caption, and a clear visual prompt or source image idea.',
      content_guidance: [
        'Use exactly three parallel items so the grid stays balanced.',
        'Choose items that can each be represented visually, not abstract filler.',
        'Keep labels short and captions concise so the images remain primary.',
      ],
    });
  });
});
