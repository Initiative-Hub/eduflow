'use client';

import { Loader2, Plus, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlannedSlide } from '../use-presentation';

/**
 * Repeatable-array config per layout: which binding key holds the items, the
 * template's max item count (matching the largest SVG variant / slot count),
 * and the object fields of each item ('*' = plain string items).
 */
const ARRAY_FIELDS: Record<
  string,
  { key: string; max: number; fields: string[] }
> = {
  TITLE_BULLETS: { key: 'bullets', max: 10, fields: ['*'] },
  AGENDA_OUTLINE: { key: 'items', max: 10, fields: ['*'] },
  STEP_BY_STEP: { key: 'steps', max: 10, fields: ['*'] },
  CONCLUSION_SUMMARY: { key: 'summary_points', max: 10, fields: ['*'] },
  CALL_TO_ACTION: { key: 'action_items', max: 10, fields: ['*'] },
  KPI_BIG_NUMBER: { key: 'metrics', max: 6, fields: ['value', 'label'] },
  TIMELINE_MILESTONES: {
    key: 'events',
    max: 10,
    fields: ['date_or_step', 'description'],
  },
  CHART_INSIGHT: {
    key: 'chart_data',
    max: 10,
    fields: ['label', 'value', 'display_value'],
  },
  REFERENCES_LIST: { key: 'sources', max: 10, fields: ['title', 'url'] },
  PYRAMID_LEVELS: { key: 'levels', max: 10, fields: ['title', 'description'] },
  FUNNEL_STAGES: { key: 'stages', max: 10, fields: ['title', 'description'] },
  PROCESS_ARROWS: {
    key: 'process_steps',
    max: 10,
    fields: ['title', 'description'],
  },
  CIRCLE_CYCLE: { key: 'phases', max: 10, fields: ['title', 'description'] },
};

interface SlideItemEditorProps {
  slides: PlannedSlide[];
  collection: string;
  /** Apply a freshly rendered SVG to slide `index` in the preview iframe. */
  onSlideRendered: (index: number, svg: string) => void;
  /** Persist updated bindings back into plannedSlides state. */
  onBindingsChanged: (index: number, bindings: Record<string, any>) => void;
  /** Triggered when the user changes slide selection in the editor panel. */
  onSelectedSlideChange?: (index: number) => void;
}

export function SlideItemEditor({
  slides,
  collection,
  onSlideRendered,
  onBindingsChanged,
  onSelectedSlideChange,
}: SlideItemEditorProps) {
  const editable = useMemo(
    () =>
      slides
        .map((s, index) => ({ slide: s, index }))
        .filter(({ slide }) => ARRAY_FIELDS[slide.layoutType]),
    [slides]
  );
  const [selected, setSelected] = useState<number | null>(
    editable.length > 0 ? editable[0].index : null
  );
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (selected !== null) {
      onSelectedSlideChange?.(selected);
    }
  }, [selected, onSelectedSlideChange]);

  if (editable.length === 0) {
    return (
      <p className="p-4 text-slate-500 text-sm">
        No slides with repeatable items in this deck.
      </p>
    );
  }

  const current = selected !== null ? slides[selected] : null;
  const config = current ? ARRAY_FIELDS[current.layoutType] : null;
  const items: any[] =
    current && config && Array.isArray(current.bindings?.[config.key])
      ? current.bindings[config.key]
      : [];

  const updateItems = (next: any[]) => {
    if (selected === null || !current || !config) return;
    onBindingsChanged(selected, { ...current.bindings, [config.key]: next });
  };

  const addItem = () => {
    if (!config) return;
    const blank =
      config.fields[0] === '*'
        ? 'New item'
        : Object.fromEntries(config.fields.map((f) => [f, '']));
    updateItems([...items, blank]);
  };

  const applyToPreview = async () => {
    if (selected === null || !current) return;
    setIsApplying(true);
    try {
      const res = await fetch('/api/v1/ai/slides/render-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutType: current.layoutType,
          slideTitle: current.slideTitle,
          bindings: current.bindings,
          collection,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.svg) {
        throw new Error(data?.message || 'Render failed');
      }
      onSlideRendered(selected, data.svg);
      toast.success('Slide updated in preview');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update slide'
      );
    } finally {
      setIsApplying(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto p-4">
      <Select
        value={selected !== null ? String(selected) : undefined}
        onValueChange={(v) => setSelected(Number(v))}
      >
        <SelectTrigger className="h-9 w-full rounded-lg text-xs">
          <SelectValue placeholder="Pick a slide to edit" />
        </SelectTrigger>
        <SelectContent>
          {editable.map(({ slide, index }) => (
            <SelectItem key={slide.id} value={String(index)}>
              {index + 1}. {slide.slideTitle || slide.layoutType}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {current && config && (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div
                key={`${config.key}-${i}`}
                className="flex items-start gap-1.5 rounded-lg border border-slate-200 p-2 dark:border-slate-800"
              >
                <span className="mt-1.5 min-w-4 font-bold text-[10px] text-slate-400">
                  {i + 1}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  {config.fields[0] === '*' ? (
                    <input
                      className={inputCls}
                      value={String(item ?? '')}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = e.target.value;
                        updateItems(next);
                      }}
                    />
                  ) : (
                    config.fields.map((f) => (
                      <input
                        key={f}
                        className={inputCls}
                        placeholder={f.replace(/_/g, ' ')}
                        value={String(item?.[f] ?? '')}
                        onChange={(e) => {
                          const next = [...items];
                          next[i] = { ...next[i], [f]: e.target.value };
                          updateItems(next);
                        }}
                      />
                    ))
                  )}
                </div>
                <button
                  type="button"
                  className="mt-1 text-slate-400 hover:text-red-500"
                  onClick={() => updateItems(items.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg text-xs"
              onClick={addItem}
              disabled={items.length >= config.max}
              title={
                items.length >= config.max
                  ? `This layout supports up to ${config.max} items`
                  : undefined
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add item ({items.length}/{config.max})
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 rounded-lg text-xs"
              onClick={applyToPreview}
              disabled={isApplying || items.length === 0}
            >
              {isApplying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              Apply to preview
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Applies instantly with no AI cost — the slide re-renders from the
            template. Use “Save Visual Edits” afterwards to persist the deck.
          </p>
        </>
      )}
    </div>
  );
}
