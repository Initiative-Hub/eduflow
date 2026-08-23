import { describe, expect, it } from 'vitest';
import {
  canvasWidthFromSvg,
  charsPerLine,
  linesThatFit,
  proposeFixes,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/_components/slot-autofix';
import type { TemplateSlot } from '@/services/SlideService';

/** Geometry copied from real extracted templates in the RMIT collections. */
function slot(over: Partial<TemplateSlot> = {}): TemplateSlot {
  return {
    kind: 'text',
    name: 'body',
    x: 0,
    y: 0,
    w: 480,
    h: 100,
    font_pt: 28,
    lines: 1,
    max_chars: 0,
    type: 'text',
    desc: '',
    bullet: null,
    warnings: [],
    ...over,
  } as TemplateSlot;
}

describe('capacity estimates', () => {
  it('derives characters per line from width and font size', () => {
    // 481 units wide at 28pt: 481 / (28 * 0.5) = 34
    expect(charsPerLine({ w: 481, font_pt: 28 })).toBe(34);
  });

  it('reports no capacity when the slot has no wrap width', () => {
    expect(charsPerLine({ w: 0, font_pt: 28 })).toBe(0);
    expect(linesThatFit({ h: 0, font_pt: 28 })).toBe(0);
  });

  it('derives how many lines fit in the frame', () => {
    // 261 tall at 28pt with 1.35 leading: floor(261 / 37.8) = 6
    expect(linesThatFit({ h: 261, font_pt: 28 })).toBe(6);
  });
});

describe('proposeFixes', () => {
  it('deletes a text slot painted over a chart frame', () => {
    // CHART_SLIDE: the chart placeholder's own prompt copy, captured as content
    const slots = [
      slot({
        name: 'chart',
        kind: 'chart',
        x: 20.9,
        y: 104.8,
        w: 680.7,
        h: 243.3,
        font_pt: 0,
      }),
      slot({
        name: 'caption',
        x: 22.9,
        y: 119.8,
        w: 676,
        h: 243,
        font_pt: 14,
        max_chars: 50,
      }),
    ];
    const { proposals } = proposeFixes(slots, 720);
    const caption = proposals.find((p) => p.name === 'caption');
    expect(caption?.patch).toEqual({ delete: true });
    // and it is not also rebudgeted — removal supersedes every other rule
    expect(caption?.patch.max_chars).toBeUndefined();
  });

  it('lowers a budget that overruns the line', () => {
    // CONTENT_SLIDE_2 body_2: 57 chars asked for, ~34 actually fit
    const { proposals } = proposeFixes(
      [
        slot({
          name: 'body_2',
          w: 481,
          h: 261,
          font_pt: 28,
          max_chars: 57,
          lines: 3,
          type: 'title',
        }),
      ],
      720
    );
    expect(proposals[0].patch.max_chars).toBe(34);
    expect(proposals[0].reason).toContain('overruns');
  });

  it('retypes a title that repeats over three or more lines', () => {
    const { proposals } = proposeFixes(
      [
        slot({
          name: 'body_2',
          w: 481,
          h: 261,
          font_pt: 28,
          max_chars: 34,
          lines: 3,
          type: 'title',
        }),
      ],
      720
    );
    expect(proposals[0].patch.type).toBe('text');
  });

  it('leaves a genuine single-line title typed as a title', () => {
    const { proposals } = proposeFixes(
      [
        slot({
          name: 'title',
          w: 679,
          h: 70,
          font_pt: 28,
          max_chars: 48,
          lines: 1,
          type: 'title',
        }),
      ],
      720
    );
    expect(proposals).toHaveLength(0);
  });

  it('gives a wrap width to a slot that has none, and budgets against it', () => {
    const { proposals } = proposeFixes(
      [slot({ name: 'body', x: 40, w: 0, font_pt: 20, max_chars: 30 })],
      720
    );
    // 720 - 40 - 36 = 644
    expect(proposals[0].patch.w).toBe(644);
    expect(proposals[0].patch.max_chars).toBe(64);
    expect(proposals[0].reason).toContain('no wrap width');
  });

  it('scales the wrap width to the slide it came from', () => {
    const big = proposeFixes([slot({ x: 80, w: 0, font_pt: 20 })], 1440);
    expect(big.proposals[0].patch.w).toBe(1288);
  });

  it('ignores a budget already within tolerance of what fits', () => {
    // 34 fit, 32 asked for: a 6% gap, inside the estimate's own error
    const { proposals } = proposeFixes(
      [slot({ w: 481, font_pt: 28, max_chars: 32 })],
      720
    );
    expect(proposals).toHaveLength(0);
  });

  it('reports an oversized frame instead of guessing at it', () => {
    const { proposals, notes } = proposeFixes(
      [
        slot({
          name: 'body_2',
          w: 481,
          h: 261,
          font_pt: 28,
          max_chars: 34,
          lines: 1,
        }),
      ],
      720
    );
    expect(proposals).toHaveLength(0);
    expect(notes[0].note).toContain('6 lines');
  });

  it('keeps text sitting on a full-bleed background image', () => {
    // TITLE_SLIDE_4: the image covers the whole slide, so every text slot
    // overlaps it — that is the design, not a stray placeholder
    const slots = [
      slot({
        name: 'image',
        kind: 'image',
        x: 0,
        y: 0,
        w: 720,
        h: 405,
        font_pt: 0,
      }),
      slot({
        name: 'title',
        x: 19.3,
        y: 46,
        w: 339,
        h: 70,
        font_pt: 28,
        max_chars: 24,
      }),
    ];
    const { proposals } = proposeFixes(slots, 720);
    expect(proposals.some((p) => p.patch.delete)).toBe(false);
  });

  it('reports a box too narrow for its font instead of gutting the budget', () => {
    // MEDIA_TEXT body: 148 wide at 28pt fits ~10 chars — the geometry is the
    // problem, so the budget is left alone
    const { proposals, notes } = proposeFixes(
      [
        slot({
          name: 'body',
          w: 148,
          h: 76,
          font_pt: 28,
          max_chars: 20,
          lines: 1,
        }),
      ],
      720
    );
    expect(proposals).toHaveLength(0);
    expect(notes[0].note).toContain('only ~10 characters fit');
  });

  it('never touches image, chart or table slots', () => {
    const { proposals, notes } = proposeFixes(
      [slot({ name: 'photo', kind: 'image', w: 0, h: 0, font_pt: 0 })],
      720
    );
    expect(proposals).toHaveLength(0);
    expect(notes).toHaveLength(0);
  });
});

describe('canvasWidthFromSvg', () => {
  it('reads the viewBox, including the fractional sizes extraction emits', () => {
    expect(canvasWidthFromSvg('<svg viewBox="0 0 720.0 405.0">')).toBe(720);
    expect(canvasWidthFromSvg('<svg viewBox="0 0 1440 810">')).toBe(1440);
  });

  it('accepts a comma-separated viewBox', () => {
    expect(canvasWidthFromSvg('<svg viewBox="0,0,960,540">')).toBe(960);
  });

  it('falls back to the width attribute, then gives up', () => {
    expect(canvasWidthFromSvg('<svg width="720" height="405">')).toBe(720);
    expect(canvasWidthFromSvg('<svg>')).toBeNull();
    expect(canvasWidthFromSvg(null)).toBeNull();
  });
});
