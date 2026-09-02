'use client';

import {
  AlertTriangle,
  Check,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Save,
  Table as TableIcon,
  Trash2,
  Type,
  Wand2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  TemplateCategoryInspection,
  TemplateSlot,
} from '@/services/SlideService';
import {
  useDeleteTemplateCategory,
  useTemplateInspection,
  useTemplateOverlay,
  useUpdateTemplateSlots,
} from '../use-lesson';
import {
  canvasWidthFromSvg,
  proposeFixes,
  type SlotNote,
} from './slot-autofix';
import { type SlotBox, SlotCanvas } from './slot-canvas';

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
  const t = useTranslations('Courses.TemplateReview');
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SlotDraft>>({});
  const [onlyWarnings, setOnlyWarnings] = useState(true);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState<SlotNote[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading } = useTemplateInspection(collection, open);

  // Set default selected category when data is loaded
  useEffect(() => {
    if (data?.categories?.length) {
      if (!selected || !data.categories.some((c) => c.category === selected)) {
        const first =
          data.categories.find((c) => c.warnings.length > 0) ??
          data.categories[0];
        setSelected(first ? first.category : null);
      }
    }
  }, [data, selected]);

  // Reset drafts when dialog opens or collection changes
  useEffect(() => {
    if (open) {
      setDrafts({});
      setNotes([]);
    }
  }, [open, collection]);

  const current: TemplateCategoryInspection | undefined = useMemo(
    () => data?.categories.find((c) => c.category === selected),
    [data, selected]
  );

  const { data: overlayData, isLoading: isOverlayLoading } = useTemplateOverlay(
    collection,
    current?.category ?? null,
    current?.variant,
    open
  );

  const overlay = overlayData?.svg ?? null;

  const deleteMutation = useDeleteTemplateCategory();
  const updateMutation = useUpdateTemplateSlots();

  const isSaving = deleteMutation.isPending || updateMutation.isPending;

  const setDraft = useCallback((name: string, patch: SlotDraft) => {
    setDrafts((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }, []);

  const dirtyCount = Object.keys(drafts).length;

  /** Live geometry per slot, so the canvas and the number fields agree. */
  const geometry = useMemo(() => {
    const out: Record<string, Partial<SlotBox>> = {};
    for (const [name, d] of Object.entries(drafts)) {
      if (
        d.x !== undefined ||
        d.y !== undefined ||
        d.w !== undefined ||
        d.h !== undefined
      ) {
        out[name] = { x: d.x, y: d.y, w: d.w, h: d.h };
      }
    }
    return out;
  }, [drafts]);

  // clear last category's advice when the reviewer moves on
  useEffect(() => setNotes([]), [selected]);

  /**
   * Delete one layout for good, then reload the report via TanStack Query invalidation.
   */
  const deleteCategory = async (category: string) => {
    if (!collection) return;
    try {
      await deleteMutation.mutateAsync({ collection, category });
      toast.success(t('deletedSuccess', { category }));
      if (selected === category) {
        setSelected(null);
        setDrafts({});
        setNotes([]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('deleteError')
      );
    } finally {
      setPendingDelete(null);
    }
  };

  /**
   * Write a set of slot edits to the template and reload the report via TanStack Query invalidation.
   */
  const applyEdits = useCallback(
    async (
      edits: ({ name: string } & SlotDraft)[],
      describe: (applied: number) => string
    ) => {
      if (!collection || !current || edits.length === 0) return;
      try {
        const json = await updateMutation.mutateAsync({
          collection,
          category: current.category,
          variant: current.variant,
          edits,
        });
        toast.success(describe(json.applied.length));
        setDrafts({});
      } catch {
        toast.error(t('saveError'));
      }
    },
    [collection, current, updateMutation, t]
  );

  /**
   * Apply every correction that is not a judgement call, straight to the
   * template. Any edits already pending go with them, so one click never
   * leaves half the reviewer's work unsaved.
   */
  const autofix = async () => {
    if (!current) return;
    const canvasW = canvasWidthFromSvg(overlay);
    if (!canvasW) {
      toast.error(t('waitingForSlide'));
      return;
    }
    const { proposals, notes: advice } = proposeFixes(
      current.slots,
      canvasW,
      current.category
    );
    setNotes(advice);
    if (proposals.length === 0) {
      toast.info(
        advice.length > 0 ? t('nothingToFixAdvice') : t('nothingToFix')
      );
      return;
    }
    const merged: Record<string, SlotDraft> = { ...drafts };
    for (const p of proposals) {
      merged[p.name] = { ...merged[p.name], ...p.patch };
    }
    await applyEdits(
      Object.entries(merged).map(([name, d]) => ({ name, ...d })),
      (n) => t('fixedCount', { count: n, category: current.category })
    );
  };

  const save = () =>
    applyEdits(
      Object.entries(drafts).map(([name, d]) => ({ name, ...d })),
      (n) => t('savedCount', { count: n, category: current?.category ?? '' })
    );

  const categories = useMemo(() => {
    const all = data?.categories ?? [];
    return onlyWarnings && all.some((c) => c.warnings.length > 0)
      ? all.filter((c) => c.warnings.length > 0)
      : all;
  }, [data, onlyWarnings]);

  const inputCls =
    'w-full rounded-md border border-input bg-background px-2 py-1 text-foreground text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-4 overflow-hidden p-6 sm:max-w-[94vw] lg:max-w-[1180px] xl:max-w-[1320px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('inspecting')}
          </div>
        ) : !data ? (
          <p className="p-6 text-muted-foreground text-sm">
            {t('nothingToInspect')}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {data.warning_count > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-medium text-amber-600 dark:text-amber-400 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('warningCount', { count: data.warning_count })}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                  <Check className="h-3.5 w-3.5" /> {t('noProblems')}
                </span>
              )}
              {data.categories.some((c) => c.warnings.length > 0) && (
                <button
                  className="text-muted-foreground text-xs underline-offset-2 hover:underline"
                  onClick={() => setOnlyWarnings((v) => !v)}
                  type="button"
                >
                  {onlyWarnings
                    ? t('showAll', { count: data.categories.length })
                    : t('showOnlyWarnings')}
                </button>
              )}
            </div>

            <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
              {/* category list */}
              <div className="w-60 shrink-0 overflow-y-auto rounded-xl border border-border">
                {categories.map((c) => (
                  <div
                    className={`group flex items-center border-border border-b text-xs last:border-0 ${
                      c.category === selected
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                    key={`${c.category}-${c.variant}`}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left"
                      onClick={() => setSelected(c.category)}
                      type="button"
                    >
                      <span className="truncate">{c.category}</span>
                      {c.warnings.length > 0 && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                    </button>
                    <button
                      aria-label={t('deleteCategoryDialog.title', {
                        category: c.category,
                      })}
                      className="shrink-0 px-2 py-2 text-muted-foreground opacity-0 transition hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      disabled={isSaving}
                      onClick={() => setPendingDelete(c.category)}
                      title={`Delete ${c.category}`}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* overlay + slot editor */}
              <div className="grid min-w-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
                <div className="flex min-w-0 flex-col gap-3 overflow-y-auto">
                  <div className="rounded-xl border border-border bg-muted/30 p-2">
                    {isOverlayLoading ? (
                      <div className="flex h-48 items-center justify-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <SlotCanvas
                        backdrop={overlay}
                        onChange={(name, box) =>
                          setDraft(name, {
                            ...box,
                            kind:
                              current?.slots.find((s) => s.name === name)
                                ?.kind ?? 'text',
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
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t('canvasInstruction')}
                    </p>
                  </div>

                  {current?.warnings.length ? (
                    <ul className="space-y-1 rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 text-xs">
                      {current.warnings.map((w) => (
                        <li className="flex gap-1.5" key={w}>
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {notes.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-lg bg-muted p-3 text-muted-foreground text-xs">
                      {notes.map((n) => (
                        <li key={`${n.name}:${n.note}`}>
                          <code className="font-semibold">{n.name}</code>:{' '}
                          {n.note}
                        </li>
                      ))}
                    </ul>
                  )}
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
                            ? 'border-destructive/40 bg-destructive/10 text-muted-foreground opacity-60'
                            : activeSlot === slot.name
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card text-card-foreground'
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
                          <span className="text-[11px] text-muted-foreground">
                            {Math.round(slot.w)}×{Math.round(slot.h)}px
                            {slot.lines > 1 ? ` · ${slot.lines} lines` : ''}
                          </span>
                          {slot.warnings.map((w) => (
                            <span
                              className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300"
                              key={w}
                            >
                              {w}
                            </span>
                          ))}
                          <button
                            className="ml-auto text-[11px] text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDraft(slot.name, { delete: !removed })
                            }
                            type="button"
                          >
                            {removed ? t('undoRemove') : t('remove')}
                          </button>
                        </div>

                        {slot.kind === 'text' && !removed && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                            <input
                              className={`${inputCls} sm:col-span-3`}
                              onChange={(e) =>
                                setDraft(slot.name, {
                                  rename: e.target.value.trim(),
                                })
                              }
                              placeholder={t('slotNamePlaceholder')}
                              value={draft.rename ?? slot.name}
                            />
                            <select
                              className={`${inputCls} sm:col-span-2`}
                              onChange={(e) =>
                                setDraft(slot.name, { type: e.target.value })
                              }
                              value={draft.type ?? slot.type}
                            >
                              {SLOT_TYPES.map((tVal) => (
                                <option key={tVal} value={tVal}>
                                  {tVal}
                                </option>
                              ))}
                            </select>
                            <input
                              className={inputCls}
                              onChange={(e) =>
                                setDraft(slot.name, {
                                  max_chars:
                                    Number(e.target.value) || undefined,
                                })
                              }
                              placeholder={t('maxCharsPlaceholder')}
                              type="number"
                              value={draft.max_chars ?? (slot.max_chars || '')}
                            />
                            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:col-span-6">
                              <input
                                checked={draft.bullet ?? slot.bullet ?? false}
                                onChange={(e) =>
                                  setDraft(slot.name, {
                                    bullet: e.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                              {t('bulletCheckbox')}
                            </label>
                            <input
                              className={`${inputCls} sm:col-span-6`}
                              onChange={(e) =>
                                setDraft(slot.name, { desc: e.target.value })
                              }
                              placeholder={t('descPlaceholder')}
                              value={draft.desc ?? slot.desc}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-border border-t pt-3">
              <span className="mr-auto text-muted-foreground text-xs">
                {dirtyCount > 0
                  ? t('unsavedChanges', { count: dirtyCount })
                  : t('noChanges')}
              </span>
              <Button
                disabled={!current || isSaving}
                onClick={autofix}
                size="sm"
                variant="outline"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t('autofix')}
              </Button>
              <Button
                disabled={dirtyCount === 0 || isSaving}
                onClick={() => {
                  setDrafts({});
                  setNotes([]);
                }}
                size="sm"
                variant="ghost"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t('reset')}
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
                {t('saveChanges')}
              </Button>
            </div>
          </>
        )}

        <AlertDialog
          onOpenChange={(o) => !o && setPendingDelete(null)}
          open={pendingDelete !== null}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('deleteCategoryDialog.title', {
                  category: pendingDelete ?? '',
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteCategoryDialog.description', {
                  collection: collection ?? '',
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>
                {t('deleteCategoryDialog.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isSaving}
                onClick={(e) => {
                  e.preventDefault();
                  if (pendingDelete) deleteCategory(pendingDelete);
                }}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t('deleteCategoryDialog.action')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
