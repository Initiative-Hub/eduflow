import type { TemplateSlot } from '@/services/SlideService';

/**
 * Turn extraction warnings into concrete corrections.
 *
 * Extraction guesses a slot's budget and type from geometry, and the warnings
 * it emits say only that something looks off — not what to do. These rules say
 * what to do, for the cases where the answer is not a judgement call. Anything
 * genuinely ambiguous is deliberately left alone and reported instead, so the
 * reviewer's attention goes to the decisions only they can make.
 *
 * Proposals are drafts, never saves: they land in the dialog's pending edits so
 * the canvas shows them and the reviewer can undo before committing.
 */

/**
 * Average glyph advance as a fraction of font size, for mixed-case Latin text
 * in the sans faces these decks use. Real advances vary by string, so every
 * capacity below is an estimate good to roughly +/-10%.
 */
const AVG_ADVANCE = 0.5;

/** Baseline-to-baseline distance as a fraction of font size. */
const LINE_HEIGHT = 1.35;

/**
 * How far a budget may sit from the measured capacity before it is worth
 * rewriting. Under this, the difference is inside the estimate's own error.
 */
const BUDGET_TOLERANCE = 0.15;

/** Share of a text slot that must sit inside a chart or table to call it spurious. */
const OVERLAP_SHARE = 0.8;

/**
 * Below this many characters per line, the box and the font disagree badly
 * enough that no budget is right — a narrow column at a headline size. Lowering
 * the budget to match would leave a slot too small to say anything, so these
 * are reported for a human rather than rewritten.
 */
const MIN_USABLE_CHARS = 12;

/** Left/right breathing room given to a slot that has no wrap width at all. */
const MARGIN_SHARE = 0.05;

export interface SlotPatch {
  type?: string;
  max_chars?: number;
  w?: number;
  delete?: boolean;
}

export interface SlotProposal {
  name: string;
  patch: SlotPatch;
  /** Plain-English reason, shown to the reviewer. */
  reason: string;
}

/** Something worth a human decision, which no rule should make automatically. */
export interface SlotNote {
  name: string;
  note: string;
}

export interface AutofixResult {
  proposals: SlotProposal[];
  notes: SlotNote[];
}

/** Characters that fit on one line of this slot, or 0 when it cannot be judged. */
export function charsPerLine(
  slot: Pick<TemplateSlot, 'w' | 'font_pt'>
): number {
  if (slot.w <= 0 || slot.font_pt <= 0) return 0;
  return Math.floor(slot.w / (slot.font_pt * AVG_ADVANCE));
}

/** Lines that fit in the slot's frame, or 0 when it cannot be judged. */
export function linesThatFit(
  slot: Pick<TemplateSlot, 'h' | 'font_pt'>
): number {
  if (slot.h <= 0 || slot.font_pt <= 0) return 0;
  return Math.max(1, Math.floor(slot.h / (slot.font_pt * LINE_HEIGHT)));
}

function overlapArea(a: TemplateSlot, b: TemplateSlot): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Corrections for one category's slots.
 *
 * `canvasW` is the slide's own width in the units the slot coordinates use —
 * templates come out of extraction at 720x405, 960x540 or 1440x810, so it can
 * never be assumed.
 */
export function proposeFixes(
  slots: TemplateSlot[],
  canvasW: number
): AutofixResult {
  const proposals: SlotProposal[] = [];
  const notes: SlotNote[] = [];
  // Charts and tables only. A full-bleed image is a background, and text over
  // a background is the design working as intended, not a stray placeholder.
  const frames = slots.filter((s) => s.kind === 'chart' || s.kind === 'table');

  for (const slot of slots) {
    if (slot.kind !== 'text') continue;
    const patch: SlotPatch = {};
    const reasons: string[] = [];

    // A text slot painted on top of a chart or table is the PowerPoint
    // placeholder's own prompt copy ("Instructions or description for adding a
    // chart"), captured as if it were content. Left in, it renders that
    // sentence over the chart on every generated slide.
    const area = slot.w * slot.h;
    const covered = frames.some(
      (f) => area > 0 && overlapArea(slot, f) / area >= OVERLAP_SHARE
    );
    if (covered) {
      proposals.push({
        name: slot.name,
        patch: { delete: true },
        reason:
          'sits on top of a chart or table — placeholder prompt text, not content',
      });
      continue;
    }

    // No wrap width means the renderer cannot break the line: the text runs off
    // the slide instead of wrapping. Give it the room left on the slide.
    let width = slot.w;
    if (width <= 0) {
      width = Math.max(1, canvasW - slot.x - canvasW * MARGIN_SHARE);
      patch.w = Math.round(width);
      reasons.push(
        `no wrap width — set to ${Math.round(width)} so text can wrap`
      );
    }

    // The budget is what the planner is told to write, per line. Too high and
    // the copy overruns the box; too low and the slide comes out half empty.
    const capacity = charsPerLine({ w: width, font_pt: slot.font_pt });
    if (capacity > 0 && capacity < MIN_USABLE_CHARS) {
      // The box is far too narrow for its own font size. Either number could be
      // the wrong one, so say so instead of picking.
      notes.push({
        name: slot.name,
        note: `only ~${capacity} characters fit per line at ${Math.round(slot.font_pt)}pt in a ${Math.round(width)}-wide box — widen the box or drop the font size`,
      });
    } else if (capacity > 0 && slot.max_chars > 0) {
      const drift = Math.abs(slot.max_chars - capacity) / capacity;
      if (drift > BUDGET_TOLERANCE) {
        patch.max_chars = capacity;
        reasons.push(
          slot.max_chars > capacity
            ? `budget ${slot.max_chars} overruns the line (~${capacity} fit) — lowered`
            : `budget ${slot.max_chars} underfills the line (~${capacity} fit) — raised`
        );
      }
    }

    // A slot repeated over three or more lines is body copy, whatever the
    // extractor typed it as; a real title does not run to three lines.
    if (
      (slot.type === 'title' || slot.type === 'subtitle') &&
      slot.lines >= 3
    ) {
      patch.type = 'text';
      reasons.push(
        `typed '${slot.type}' but repeats over ${slot.lines} lines — retyped as text`
      );
    }

    // Room for far more lines than the template actually has placeholders for.
    // Raising the budget cannot fix it (the extra lines have nowhere to go) and
    // shrinking the frame changes the design, so this one is the reviewer's.
    const fits = linesThatFit(slot);
    if (fits > 0 && slot.lines > 0 && fits >= slot.lines * 2) {
      notes.push({
        name: slot.name,
        note: `frame holds about ${fits} lines but the template only has ${slot.lines} — shrink the box, or accept the whitespace`,
      });
    }

    if (Object.keys(patch).length > 0) {
      proposals.push({ name: slot.name, patch, reason: reasons.join('; ') });
    }
  }

  return { proposals, notes };
}

/** The slide's own coordinate width, read off the overlay SVG markup. */
export function canvasWidthFromSvg(svg: string | null): number | null {
  if (!svg) return null;
  const vb = /viewBox="([^"]+)"/.exec(svg);
  if (vb) {
    const parts = vb[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts[2] > 0) return parts[2];
  }
  const w = /<svg[^>]*\bwidth="([\d.]+)/.exec(svg);
  return w ? Number(w[1]) : null;
}
