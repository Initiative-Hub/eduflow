import { describe, expect, it } from 'vitest';
import { getCriticalDeckWarnings } from '@/utils/slide-deck-warnings';

/** Real warnings observed on a 20-slide RMIT deck that rendered correctly. */
const DROPPED_BINDINGS =
  "Slide 0 (TITLE_SLIDE): dropped bindings ['heading', 'heading.1', 'heading.2', 'subtitle'] — category has 2 text slot(s) (body, caption)";
const IMAGE_FAILED =
  "Slide 3: image 'image' failed (billing_hard_limit_reached); slot left empty.";
const SLIDE_SKIPPED = 'Slide 5 (MYSTERY): no variant selected; skipped.';
const NO_CATEGORY = "Slide 7: no category matches 'UNKNOWN'; skipped.";

describe('getCriticalDeckWarnings', () => {
  it('hides dropped-binding noise, which fires even when slides render fine', () => {
    expect(getCriticalDeckWarnings([DROPPED_BINDINGS])).toEqual([]);
  });

  it('surfaces failed images', () => {
    expect(getCriticalDeckWarnings([DROPPED_BINDINGS, IMAGE_FAILED])).toEqual([
      IMAGE_FAILED,
    ]);
  });

  it('surfaces skipped slides', () => {
    expect(
      getCriticalDeckWarnings([SLIDE_SKIPPED, DROPPED_BINDINGS, NO_CATEGORY])
    ).toEqual([SLIDE_SKIPPED, NO_CATEGORY]);
  });

  it('stays silent for a deck of only binding noise', () => {
    const twentySlides = Array.from({ length: 20 }, () => DROPPED_BINDINGS);
    expect(getCriticalDeckWarnings(twentySlides)).toHaveLength(0);
  });

  it('handles missing or empty input', () => {
    expect(getCriticalDeckWarnings(undefined)).toEqual([]);
    expect(getCriticalDeckWarnings([])).toEqual([]);
  });
});
