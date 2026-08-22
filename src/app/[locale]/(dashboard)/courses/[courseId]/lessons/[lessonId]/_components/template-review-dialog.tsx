'use client';

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Save,
  Table as TableIcon,
  Type,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type SlotBox, SlotCanvas } from './slot-canvas';
import type {
  TemplateCategoryInspection,
  TemplateInspection,
  TemplateSlot,
} from '@/services/SlideService';

/** A slot the reviewer has changed; only these keys are sent to the API. */
type SlotDraft = {
  rename?: string;
  type?: string;
  desc?: string;
  max_chars?: number;
  bullet?: boolean;
  delete?: boolean;
  kind?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

const SLOT_TYPES = ['title', 'subtitle', 'text', 'stat', 'caption'];

const KIND_ICON: Record<string, typeof Type> = {
  text: Type,
  image: ImageIcon,
  chart: TableIcon,
  table: TableIcon,
};

const KIND_COLOR: Record<string, string> = {
  text: 'text-blue-600 dark:text-blue-400',
  image: 'text-emerald-600 dark:text-emerald-400',
  chart: 'text-orange-600 dark:text-orange-400',
  table: 'text-violet-600 dark:text-violet-400',
};

interface TemplateReviewDialogProps {
  collection: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Review an extracted template before relying on it.
 *
 * Extraction infers each slot from geometry, so some decisions are wrong in
 * ways that only show up once a deck is generated — a body box named
 * `title_2`, a full-slide box with a 32-character budget. This shows what was
 * detected (with the slide overlaid) and lets the reviewer correct it.
 */
export function TemplateReviewDialog({
  collection,
  open,
  onOpenChange,
}: TemplateReviewDialogProps) {
  const [data, setData] = useState<TemplateInspection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [isOverlayLoading, setIsOverlayLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, SlotDraft>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [onlyWarnings, setOnlyWarnings] = useState(true);

  // load the inspection report whenever the dialog opens for a collection
  useEffect(() => {
    if (!open || !collection) return;
    let cancelled = false;
    setIsLoading(true);
    setData(null);
    setDrafts({});
    fetch(
      `/api/v1/ai/templates/${encodeURIComponent(collection)}/inspect`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((json: TemplateInspection) => {
        if (cancelled) return;
        setData(json);
        const first =
          json.categories.find((c) => c.warnings.length > 0) ??
          json.categories[0];
        setSelected(first ? first.category : null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not inspect this template');
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, collection]);

  const current: TemplateCategoryInspection | undefined = useMemo(
    () => data?.categories.find((c) => c.category === selected),
    [data, selected]
  );

  // fetch the labelled slide overlay for whichever category is selected
  useEffect(() => {
    if (!open || !collection || !current) {
      setOverlay(null);
      return;
    }
    let cancelled = false;
    setIsOverlayLoading(true);
    fetch(
      `/api/v1/ai/templates/${encodeURIComponent(collection)}/inspect/` +
        `${encodeURIComponent(current.category)}/overlay?variant=${encodeURIComponent(current.variant)}&boxes=false&editable=true`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((json: { svg: string }) => !cancelled && setOverlay(json.svg))
      .catch(() => !cancelled && setOverlay(null))
      .finally(() => !cancelled && setIsOverlayLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, collection, current]);

  const setDraft = useCallback((name: string, patch: SlotDraft) => {
    setDrafts((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }, []);

  const dirtyCount = Object.keys(drafts).length;

  /** Live geometry per slot, so the canvas and the number fields agree. */
  const geometry = useMemo(() => {
    const out: Record<string, Partial<SlotBox>> = {};
    for (const [name, d] of Object.entries(drafts)) {
      if (d.x !== undefined || d.y !== undefined || d.w !== undefined || d.h !== undefined) {
        out[name] = { x: d.x, y: d.y, w: d.w, h: d.h };
      }
    }
    return out;
  }, [drafts]);

  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const save = async () => {
    if (!collection || !current || dirtyCount === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/v1/ai/templates/${encodeURIComponent(collection)}/inspect`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: current.category,
            variant: current.variant,
            edits: Object.entries(drafts).map(([name, d]) => ({ name, ...d })),
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { applied: string[] };
      toast.success(`Saved ${json.applied.length} change(s) to ${current.category}`);
      setDrafts({});
      // refresh so the table and overlay show the corrected slots
      const fresh = await fetch(
        `/api/v1/ai/templates/${encodeURIComponent(collection)}/inspect`
      ).then((r) => r.json());
      setData(fresh);
    } catch {
      toast.error('Could not save the slot changes');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = useMemo(() => {
    const all = data?.categories ?? [];
    return onlyWarnings && all.some((c) => c.warnings.length > 0)
      ? all.filter((c) => c.warnings.length > 0)
      : all;
  }, [data, onlyWarnings]);

  const inputCls =
    'w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-4 overflow-hidden p-6 sm:max-w-[94vw] lg:max-w-[1180px] xl:max-w-[1320px]">
        <DialogHeader>
          <DialogTitle>Review extracted template</DialogTitle>
          <DialogDescription>
            Extraction guesses each slot from the slide’s geometry. Check what it
            found and correct anything wrong before generating decks with it.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Inspecting template…
          </div>
        ) : !data ? (
          <p className="p-6 text-slate-500 text-sm">
            Nothing to inspect for this collection.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {data.warning_count > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900 text-xs dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {data.warning_count} slot
                  {data.warning_count === 1 ? '' : 's'} need a look
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900 text-xs dark:bg-emerald-950 dark:text-emerald-200">
                  <Check className="h-3.5 w-3.5" /> No problems detected
                </span>
              )}
              {data.categories.some((c) => c.warnings.length > 0) && (
                <button
                  className="text-slate-500 text-xs underline-offset-2 hover:underline"
                  onClick={() => setOnlyWarnings((v) => !v)}
                  type="button"
                >
                  {onlyWarnings
                    ? `Show all ${data.categories.length} categories`
                    : 'Show only categories with warnings'}
                </button>
              )}
            </div>

            <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
              {/* category list */}
              <div className="w-60 shrink-0 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                {categories.map((c) => (
                  <button
                    className={`flex w-full items-center justify-between gap-2 border-slate-100 border-b px-3 py-2 text-left text-xs last:border-0 dark:border-slate-800 ${
                      c.category === selected
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                    key={`${c.category}-${c.variant}`}
                    onClick={() => setSelected(c.category)}
                    type="button"
                  >
                    <span className="truncate">{c.category}</span>
                    {c.warnings.length > 0 && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* overlay + slot editor */}
              <div className="grid min-w-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
                <div className="flex min-w-0 flex-col gap-3 overflow-y-auto">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  {isOverlayLoading ? (
                    <div className="flex h-48 items-center justify-center text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <SlotCanvas
                      backdrop={overlay}
                      onChange={(name, box) =>
                        setDraft(name, {
                          ...box,
                          kind:
                            current?.slots.find((s) => s.name === name)?.kind ??
                            'text',
                        })
                      }
                      onSelect={setActiveSlot}
                      overrides={geometry}
                      selected={activeSlot}
                      slots={(current?.slots ?? []).filter(
                        (s) => drafts[s.name]?.delete !== true
                      )}
                    />
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Drag a box to move it, or its corner to resize. Changes show
                    here immediately and are saved with the rest.
                  </p>
                </div>

                {current?.warnings.length ? (
                  <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-amber-900 text-xs dark:bg-amber-950/40 dark:text-amber-200">
                    {current.warnings.map((w) => (
                      <li className="flex gap-1.5" key={w}>
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : null}

                </div>

                <div className="min-w-0 space-y-2 overflow-y-auto pr-1">
                  {current?.slots.map((slot: TemplateSlot) => {
                    const draft = drafts[slot.name] ?? {};
                    const Icon = KIND_ICON[slot.kind] ?? Type;
                    const removed = draft.delete === true;
                    return (
                      <div
                        className={`rounded-lg border p-2.5 ${
                          removed
                            ? 'border-red-200 bg-red-50/60 opacity-60 dark:border-red-900 dark:bg-red-950/30'
                            : activeSlot === slot.name
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-800'
                        }`}
                        key={slot.name}
                        onClick={() => setActiveSlot(slot.name)}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Icon
                            className={`h-3.5 w-3.5 ${KIND_COLOR[slot.kind] ?? ''}`}
                          />
                          <code className="font-semibold text-xs">
                            {slot.name}
                          </code>
                          <span className="text-[11px] text-slate-400">
                            {Math.round(slot.w)}×{Math.round(slot.h)}px
                            {slot.lines > 1 ? ` · ${slot.lines} lines` : ''}
                          </span>
                          {slot.warnings.map((w) => (
                            <span
                              className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                              key={w}
                            >
                              {w}
                            </span>
                          ))}
                          <button
                            className="ml-auto text-[11px] text-slate-400 hover:text-red-500"
                            onClick={() =>
                              setDraft(slot.name, { delete: !removed })
                            }
                            type="button"
                          >
                            {removed ? 'undo remove' : 'remove'}
                          </button>
                        </div>

                        {slot.kind === 'text' && !removed && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                            <input
                              className={`${inputCls} sm:col-span-3`}
                              defaultValue={slot.name}
                              onChange={(e) =>
                                setDraft(slot.name, {
                                  rename: e.target.value.trim(),
                                })
                              }
                              placeholder="slot name"
                            />
                            <select
                              className={`${inputCls} sm:col-span-2`}
                              defaultValue={slot.type}
                              onChange={(e) =>
                                setDraft(slot.name, { type: e.target.value })
                              }
                            >
                              {SLOT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <input
                              className={inputCls}
                              defaultValue={slot.max_chars || ''}
                              onChange={(e) =>
                                setDraft(slot.name, {
                                  max_chars:
                                    Number(e.target.value) || undefined,
                                })
                              }
                              placeholder="max chars"
                              type="number"
                            />
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 sm:col-span-6 dark:text-slate-400">
                              <input
                                defaultChecked={
                                  draft.bullet ?? slot.bullet ?? undefined
                                }
                                onChange={(e) =>
                                  setDraft(slot.name, {
                                    bullet: e.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                              Render as a bullet list (adds “•” to each line)
                            </label>
                            <input
                              className={`${inputCls} sm:col-span-6`}
                              defaultValue={slot.desc}
                              onChange={(e) =>
                                setDraft(slot.name, { desc: e.target.value })
                              }
                              placeholder="What should the AI write here?"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-slate-200 border-t pt-3 dark:border-slate-800">
              <span className="mr-auto text-slate-400 text-xs">
                {dirtyCount > 0
                  ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}`
                  : 'No changes'}
              </span>
              <Button
                disabled={dirtyCount === 0 || isSaving}
                onClick={() => setDrafts({})}
                size="sm"
                variant="ghost"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                disabled={dirtyCount === 0 || isSaving}
                onClick={save}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
