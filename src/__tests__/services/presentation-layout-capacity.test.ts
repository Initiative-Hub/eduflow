import { describe, expect, it } from 'vitest';
import { PresentationService } from '@/services/PresentationService';

/**
 * Extracted brand templates are sparse: a divider layout may expose only a
 * `title` slot. Anything else the planner supplies is dropped when the deck is
 * filled, producing a heading on an empty background. The prompt therefore has
 * to state each layout's real capacity.
 */
const RMIT_METADATA = {
  SECTION_HEADER_2: { text_slots: 1, image_slots: 0, capacity: 1 },
  END_SLIDE: { text_slots: 1, image_slots: 0, capacity: 1 },
  CONTENT_SLIDE: { text_slots: 2, image_slots: 0, capacity: 4 },
  IMAGE_GALLERY: {
    text_slots: 7,
    image_slots: 3,
    capacity: 6,
    prompt_hint: 'A photo gallery with captions.',
  },
};

function buildPrompt() {
  // Exercised through the public planning prompt builder.
  return (
    PresentationService as unknown as {
      buildCustomTemplatePrompt: (opts: unknown) => string;
    }
  ).buildCustomTemplatePrompt({
    lessonTitle: 'Quy trình thực thi',
    contentSnippet: 'Lesson body',
    targetSlideCount: 10,
    templateCategories: Object.keys(RMIT_METADATA),
    templateCategoryMetadata: RMIT_METADATA,
  });
}

describe('planner layout capacity guidance', () => {
  it('marks title-only layouts so content is not routed to them', () => {
    const prompt = buildPrompt();

    for (const category of ['SECTION_HEADER_2', 'END_SLIDE']) {
      const line = prompt
        .split('\n')
        .find((row) => row.startsWith(`- '${category}'`));
      expect(line, `missing guidance for ${category}`).toBeDefined();
      expect(line).toContain('TITLE ONLY');
      expect(line).toContain('leave bindings empty');
    }
  });

  it('states the content budget for layouts that can hold content', () => {
    const prompt = buildPrompt();
    const line = prompt
      .split('\n')
      .find((row) => row.startsWith("- 'CONTENT_SLIDE'"));

    expect(line).toContain('2 text slot(s)');
    expect(line).toContain('4 content item(s)');
    expect(line).not.toContain('TITLE ONLY');
  });

  it('keeps the template prompt hint alongside the capacity note', () => {
    const prompt = buildPrompt();
    const line = prompt
      .split('\n')
      .find((row) => row.startsWith("- 'IMAGE_GALLERY'"));

    expect(line).toContain('A photo gallery with captions.');
    expect(line).toContain('7 text slot(s)');
  });

  it('omits capacity wording when the template reports none', () => {
    const prompt = (
      PresentationService as unknown as {
        buildCustomTemplatePrompt: (opts: unknown) => string;
      }
    ).buildCustomTemplatePrompt({
      lessonTitle: 'Lesson',
      contentSnippet: 'Body',
      targetSlideCount: 5,
      templateCategories: ['MYSTERY_SLIDE'],
      templateCategoryMetadata: { MYSTERY_SLIDE: { description: 'Unknown.' } },
    });

    const line = prompt
      .split('\n')
      .find((row) => row.startsWith("- 'MYSTERY_SLIDE'"));

    expect(line).toContain('Unknown.');
    expect(line).not.toContain('text slot(s)');
    expect(line).not.toContain('TITLE ONLY');
  });
});
