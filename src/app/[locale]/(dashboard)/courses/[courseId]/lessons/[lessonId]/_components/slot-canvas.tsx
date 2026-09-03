'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TemplateSlot } from '@/services/SlideService';

/**
 * Fallback canvas, used only when the SVG declares no size at all.
 *
 * Slot coordinates are in the template SVG's own user units, and extraction
 * emits several sizes depending on the source deck (720x405, 960x540 and
 * 1440x810 all occur in one library). Assuming one of them would draw every
 * box at the wrong scale, so the real viewBox is read off the SVG instead.
 */
const FALLBACK_W = 1440;
const FALLBACK_H = 810;

/** Parse the user-unit canvas the slot coordinates are expressed in. */
function readViewBox(svg: SVGSVGElement): { w: number; h: number } | null {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    // "min-x min-y width height", separated by whitespace and/or commas
    const parts = vb
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { w: parts[2], h: parts[3] };
    }
  }
  const w = Number.parseFloat(svg.getAttribute('width') ?? '');
  const h = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (w > 0 && h > 0) return { w, h };
  return null;
}

const KIND_COLOR: Record<string, string> = {
  text: '#2F6FEB',
  image: '#3AA76D',
  chart: '#E4572E',
  table: '#7E5BEF',
};

export interface SlotBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SlotCanvasProps {
  /** Slide SVG with every element tagged `data-slot-name` and filled with sample copy. */
  backdrop: string | null;
  slots: TemplateSlot[];
  overrides: Record<string, Partial<SlotBox>>;
  selected: string | null;
  onSelect: (name: string) => void;
  onChange: (name: string, box: SlotBox) => void;
}

/**
 * Drag the slide's real content, PowerPoint-style.
 *
 * The backdrop is the live SVG, not a picture, and every element carries the
 * slot it belongs to. Dragging moves those elements in the DOM as the pointer
 * moves, so the text itself travels with the handle instead of an empty outline
 * sliding over a frozen image. Nothing is written to the file until Save; the
 * DOM nudges are cosmetic and the authoritative values go up as slot edits.
 */
export function SlotCanvas({
  backdrop,
  slots,
  overrides,
  selected,
  onSelect,
  onChange,
}: SlotCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svgHost = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    name: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    box: SlotBox;
  } | null>(null);
  /** The injected slide's own coordinate space; null until it has been read. */
  const [canvas, setCanvas] = useState<{ w: number; h: number } | null>(null);

  // Read the coordinate space off the SVG each time one is injected. Every
  // percentage below divides by this, so an outline lands exactly where the
  // element it describes is painted.
  useEffect(() => {
    if (!backdrop) {
      setCanvas(null);
      return;
    }
    const svg = svgHost.current?.querySelector('svg');
    if (!svg) {
      setCanvas(null);
      return;
    }
    // An SVG with no declared size still gets boxes, on the fallback canvas;
    // null is reserved for "no slide injected yet" so the outlines can be held
    // back until they can be placed correctly.
    setCanvas(readViewBox(svg) ?? { w: FALLBACK_W, h: FALLBACK_H });
  }, [backdrop]);

  const slideW = canvas?.w ?? FALLBACK_W;
  const slideH = canvas?.h ?? FALLBACK_H;

  const boxFor = useCallback(
    (slot: TemplateSlot): SlotBox => {
      const o = overrides[slot.name] ?? {};
      return {
        x: o.x ?? slot.x,
        y: o.y ?? slot.y,
        // Defaults for slots extraction left unsized are a fraction of the
        // canvas, not pixels — a literal 240 is a sixth of a 1440 slide but a
        // third of a 720 one.
        w: o.w ?? slot.w ?? slideW / 6,
        h: o.h ?? slot.h ?? Math.max(slot.font_pt * 1.4, slideH / 34),
      };
    },
    [overrides, slideW, slideH]
  );

  /**
   * Shift a slot's real SVG elements by a delta.
   *
   * A multi-line placeholder is several <text> elements, so every one moves by
   * the SAME delta — setting them all to one y would stack the lines.
   */
  const nudgeElements = useCallback(
    (name: string, dx: number, dy: number, w?: number, h?: number) => {
      const host = svgHost.current?.querySelector('svg');
      if (!host) return;
      const els = host.querySelectorAll(
        `[data-slot-name="${CSS.escape(name)}"]`
      );
      for (const el of els) {
        const baseX = Number(
          el.getAttribute('data-ox') ?? el.getAttribute('x') ?? 0
        );
        const baseY = Number(
          el.getAttribute('data-oy') ?? el.getAttribute('y') ?? 0
        );
        // remember the authored position once, so repeated drags stay absolute
        if (!el.hasAttribute('data-ox')) {
          el.setAttribute('data-ox', String(baseX));
          el.setAttribute('data-oy', String(baseY));
        }
        el.setAttribute('x', String(baseX + dx));
        el.setAttribute('y', String(baseY + dy));
        if (w !== undefined && el.hasAttribute('width')) {
          el.setAttribute('width', String(w));
        }
        if (h !== undefined && el.hasAttribute('height')) {
          el.setAttribute('height', String(h));
        }
        if (w !== undefined && el.hasAttribute('data-w')) {
          el.setAttribute('data-w', String(w));
        }
      }
    },
    []
  );

  // re-apply every pending move after the SVG is (re)injected
  useEffect(() => {
    for (const [name, o] of Object.entries(overrides)) {
      const slot = slots.find((s) => s.name === name);
      if (!slot) continue;
      nudgeElements(
        name,
        (o.x ?? slot.x) - slot.x,
        (o.y ?? slot.y) - slot.y,
        o.w,
        o.h
      );
    }
  }, [backdrop, overrides, slots, nudgeElements]);

  const toSlideUnits = useCallback(
    (dxPx: number, dyPx: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return { dx: 0, dy: 0 };
      return {
        dx: (dxPx / rect.width) * slideW,
        dy: (dyPx / rect.height) * slideH,
      };
    },
    [slideW, slideH]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const { dx, dy } = toSlideUnits(
        e.clientX - drag.startX,
        e.clientY - drag.startY
      );
      const slot = slots.find((s) => s.name === drag.name);
      const next: SlotBox =
        drag.mode === 'move'
          ? {
              ...drag.box,
              x: Math.max(0, Math.round(drag.box.x + dx)),
              y: Math.max(0, Math.round(drag.box.y + dy)),
            }
          : {
              ...drag.box,
              w: Math.max(slideW / 60, Math.round(drag.box.w + dx)),
              h: Math.max(slideH / 50, Math.round(drag.box.h + dy)),
            };
      if (slot) {
        nudgeElements(
          drag.name,
          next.x - slot.x,
          next.y - slot.y,
          drag.mode === 'resize' ? next.w : undefined,
          drag.mode === 'resize' ? next.h : undefined
        );
      }
      onChange(drag.name, next);
    },
    [drag, onChange, toSlideUnits, slots, nudgeElements, slideW, slideH]
  );

  const endDrag = useCallback(() => setDrag(null), []);

  // The frame takes the slide's own aspect, so `[&>svg]:h-full [&>svg]:w-full`
  // scales the SVG uniformly and one user unit covers the same fraction of the
  // frame on both axes — which is what makes the percentages below line up.
  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-lg bg-white"
      onPointerLeave={endDrag}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      ref={ref}
      style={{ aspectRatio: `${slideW} / ${slideH}` }}
    >
      {backdrop ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered template SVG
        <div
          className="pointer-events-none absolute inset-0 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: backdrop }}
          ref={svgHost}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800" />
      )}

      {(canvas ? slots : []).map((slot) => {
        const box = boxFor(slot);
        const top = box.y - (slot.kind === 'text' ? slot.font_pt * 0.85 : 0);
        const colour = KIND_COLOR[slot.kind] ?? '#888888';
        const isActive = selected === slot.name;
        const isDragging = drag?.name === slot.name;
        return (
          <div
            className="absolute cursor-move"
            key={slot.name}
            onPointerDown={(e) => {
              e.preventDefault();
              onSelect(slot.name);
              setDrag({
                name: slot.name,
                mode: 'move',
                startX: e.clientX,
                startY: e.clientY,
                box,
              });
            }}
            style={{
              left: `${(box.x / slideW) * 100}%`,
              top: `${(top / slideH) * 100}%`,
              width: `${(box.w / slideW) * 100}%`,
              height: `${(box.h / slideH) * 100}%`,
              // only outline while selected/dragging, so the slide stays readable
              border: isActive
                ? `2px solid ${colour}`
                : `1px dashed ${colour}66`,
              background: isDragging ? `${colour}18` : 'transparent',
              boxShadow: isActive ? `0 0 0 2px ${colour}44` : undefined,
            }}
            title={`${slot.name} — drag to move, corner to resize`}
          >
            {isActive && (
              <span
                className="pointer-events-none absolute -top-[18px] left-0 whitespace-nowrap rounded px-1.5 py-px font-mono text-[10px] text-white"
                style={{ background: colour }}
              >
                {slot.name}
                {slot.kind === 'text' && slot.max_chars
                  ? ` · ${slot.max_chars}ch`
                  : ` · ${slot.kind}`}
              </span>
            )}
            <span
              className="absolute right-[-5px] bottom-[-5px] h-2.5 w-2.5 cursor-se-resize rounded-sm border border-white"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(slot.name);
                setDrag({
                  name: slot.name,
                  mode: 'resize',
                  startX: e.clientX,
                  startY: e.clientY,
                  box,
                });
              }}
              style={{ background: colour, opacity: isActive ? 1 : 0.5 }}
            />
          </div>
        );
      })}
    </div>
  );
}
