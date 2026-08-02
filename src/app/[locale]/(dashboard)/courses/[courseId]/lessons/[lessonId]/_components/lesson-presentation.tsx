'use client';

import slideLayoutGuidance from '@config/slide-layout-guidance.json';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutTemplate,
  ListPlus,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { sanitizeSvgMarkup } from '@/lib/html-sanitizer';
import { cn } from '@/lib/utils';
import type { TiptapDocument } from '@/utils/lesson-content';
import {
  applySlideDropRuntime,
  removeLegacySlideDropStyles,
  SLIDE_DROP_ATTRIBUTE,
} from '@/utils/slide-deck-drop';
import {
  useDownloadPptx,
  useSlideTemplateCategories,
  useSlideTemplatePreviews,
  useSlideTemplates,
  useUpdateSlideHtml,
} from '../use-lesson';
import {
  normalizeSlideBindings,
  type PlannedSlide,
  usePresentation,
} from '../use-presentation';
import { PresentationExportActions } from './presentation-export-actions';
import { SlideAiEditDialog } from './slide-ai-edit-dialog';
import {
  attachSlideCanvasAiControls,
  type SlideCanvasAiControls,
} from './slide-canvas-ai-controls';
import { SlideItemEditor } from './slide-item-editor';
import { TemplateManagerDialog } from './template-manager-dialog';
import {
  getEditableSlideTextElements,
  useSlideAiEdit,
} from './use-slide-ai-edit';
import { useSlideDrop } from './use-slide-drop';

const formatLayoutName = (layout: string, t: any) => {
  const map: Record<string, string> = {
    TITLE_SLIDE: 'Title Slide',
    AGENDA_OUTLINE: 'Agenda & Outline',
    SECTION_HEADER: 'Section Header',
    TITLE_BULLETS: 'Title & Bullets',
    TWO_COLUMN_SPLIT: 'Two Column Split',
    BIG_QUOTE_TAKEAWAY: 'Big Quote Takeaway',
    KPI_BIG_NUMBER: 'KPI & Big Numbers',
    CHART_INSIGHT: 'Chart & Insight',
    DATA_TABLE: 'Data Table',
    MEDIA_TEXT: 'Media & Text',
    TIMELINE_MILESTONES: 'Timeline & Milestones',
    STEP_BY_STEP: 'Step By Step Process',
    CONCLUSION_SUMMARY: 'Conclusion & Summary',
    CALL_TO_ACTION: 'Call To Action / Homework',
    QA_CONTACT: 'Q&A Closing Slide',
    REFERENCES_LIST: t('referencesLayout') || 'References List',
    STATEMENT_IMAGE: 'Statement + Illustration',
    PYRAMID_LEVELS: 'Pyramid / Hierarchy',
    FUNNEL_STAGES: 'Funnel Stages',
    PROCESS_ARROWS: 'Process Arrows',
    CIRCLE_CYCLE: 'Circular Cycle',
  };
  if (map[layout]) return map[layout];
  return layout
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const selectItemHighlightClassName =
  'focus:bg-primary/20 focus:text-foreground focus:**:!text-foreground data-highlighted:bg-primary/10 data-highlighted:text-foreground data-highlighted:**:!text-foreground';

function RawBindingsEditor({
  bindings,
  onChangeBindings,
}: {
  bindings: any;
  onChangeBindings: (newBindings: any) => void;
}) {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(bindings || {}, null, 2)
  );
  const [isValidJson, setIsValidJson] = useState(true);

  const prevBindingsRef = useRef(bindings);
  useEffect(() => {
    if (prevBindingsRef.current !== bindings) {
      prevBindingsRef.current = bindings;
      try {
        if (JSON.stringify(JSON.parse(jsonText)) !== JSON.stringify(bindings)) {
          setJsonText(JSON.stringify(bindings || {}, null, 2));
          setIsValidJson(true);
        }
      } catch (_) {}
    }
  }, [bindings, jsonText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'object' && parsed !== null) {
        setIsValidJson(true);
        onChangeBindings(parsed);
      } else {
        setIsValidJson(false);
      }
    } catch (_) {
      setIsValidJson(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
          Raw Bindings Data (JSON)
        </span>
        {!isValidJson && (
          <span className="font-medium text-[11px] text-destructive">
            ⚠️ Invalid JSON format (e.g.{' '}
            <code className="font-mono text-[10px]">
              {'{"footer_note": "Phat Huynh"}'}
            </code>
            )
          </span>
        )}
      </div>
      <Textarea
        value={jsonText}
        onChange={handleChange}
        placeholder='{\n  "footer_note": "Phat Huynh"\n}'
        className={cn(
          'h-36 rounded-xl border-input bg-card px-4 py-2 font-mono text-foreground text-xs transition-colors',
          !isValidJson &&
            'border-destructive/60 ring-2 ring-destructive/20 focus-visible:ring-destructive/40'
        )}
      />
    </div>
  );
}

const ALL_LAYOUT_CATEGORIES = [
  'TITLE_SLIDE',
  'AGENDA_OUTLINE',
  'SECTION_HEADER',
  'TITLE_BULLETS',
  'TWO_COLUMN_SPLIT',
  'BIG_QUOTE_TAKEAWAY',
  'KPI_BIG_NUMBER',
  'CHART_INSIGHT',
  'DATA_TABLE',
  'MEDIA_TEXT',
  'TIMELINE_MILESTONES',
  'STEP_BY_STEP',
  'CONCLUSION_SUMMARY',
  'CALL_TO_ACTION',
  'QA_CONTACT',
  'REFERENCES_LIST',
  'STATEMENT_IMAGE',
  'PYRAMID_LEVELS',
  'FUNNEL_STAGES',
  'PROCESS_ARROWS',
  'CIRCLE_CYCLE',
];

interface LayoutCategorySelectProps {
  value: string;
  onValueChange: (val: string) => void;
  categories: string[];
  previewMap: Map<string, string>;
  t: any;
}

function LayoutCategorySelect({
  value,
  onValueChange,
  categories,
  previewMap,
  t,
}: LayoutCategorySelectProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const activeCategory = hoveredCategory || value;
  const activePreviewUrl = previewMap.get(activeCategory);
  const activeGuidance = (slideLayoutGuidance as Record<string, any>)[
    activeCategory
  ];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="flex h-10 w-full justify-between rounded-xl border-input bg-muted/30 px-4 font-semibold text-foreground text-sm">
        <SelectValue placeholder="Select Layout">
          {formatLayoutName(value, t)}
        </SelectValue>
      </SelectTrigger>

      <SelectContent
        position="popper"
        align="start"
        sideOffset={4}
        className="!w-[540px] z-50 max-h-80 max-w-[92vw] overflow-hidden rounded-2xl border-border bg-popover/95 p-2 text-popover-foreground shadow-2xl backdrop-blur-xl"
        onMouseLeave={() => setHoveredCategory(null)}
      >
        <div className="flex h-full w-full gap-2.5 p-1">
          {/* Left Column: Category Options List */}
          <div className="max-h-72 w-56 shrink-0 space-y-0.5 overflow-y-auto pr-1">
            {categories.map((layout) => (
              <SelectItem
                key={layout}
                value={layout}
                onPointerEnter={() => setHoveredCategory(layout)}
                onFocus={() => setHoveredCategory(layout)}
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-accent focus:bg-accent',
                  selectItemHighlightClassName
                )}
              >
                {formatLayoutName(layout, t)}
              </SelectItem>
            ))}
          </div>

          {/* Right Column: Attached Live Preview Panel */}
          <div className="flex w-64 shrink-0 flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-3">
            {activePreviewUrl ? (
              <>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
                  <img
                    src={activePreviewUrl}
                    alt={activeCategory}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 px-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate font-bold text-foreground text-xs">
                      {formatLayoutName(activeCategory, t)}
                    </span>
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono font-semibold text-[9px] text-primary">
                      {activeCategory}
                    </span>
                  </div>
                  {activeGuidance?.description && (
                    <p className="line-clamp-3 text-[11px] text-muted-foreground leading-snug">
                      {activeGuidance.description}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
                <LayoutTemplate className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="font-semibold text-muted-foreground text-xs">
                  Hover over a layout
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                  Preview will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </SelectContent>
    </Select>
  );
}

const QUALITATIVE_CHART_SCORES: Record<string, number> = {
  'very low': 1,
  low: 2,
  medium: 3,
  moderate: 3,
  high: 4,
  'very high': 5,
  strong: 4,
  weak: 2,
  critical: 5,
  stable: 3,
};

const parseChartMagnitude = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) return null;

  for (const [label, score] of Object.entries(QUALITATIVE_CHART_SCORES)) {
    if (normalized.includes(label)) return score;
  }

  const rangeMatch = normalized.match(
    /(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/
  );
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return (start + end) / 2;
    }
  }

  const numericMatch = normalized.match(/-?\d+(?:\.\d+)?/);
  if (numericMatch) {
    const parsed = Number(numericMatch[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getChartDisplayValue = (item: any) => {
  const explicit =
    typeof item?.display_value === 'string' ? item.display_value.trim() : '';
  if (explicit) return explicit;
  return String(item?.value ?? '').trim();
};

interface LessonPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: TiptapDocument;
}

export function LessonPresentation({
  isOpen,
  onClose,
  title,
  content,
}: LessonPresentationProps) {
  const t = useTranslations('Courses.LessonPresentation');
  const params = useParams();
  const lessonId = params.lessonId as string;
  const {
    step,
    setStep,
    instructions,
    setInstructions,
    duration,
    setDuration,
    plannedSlides,
    setPlannedSlides,
    loaderStep,
    currentSlideIndex,
    setCurrentSlideIndex,
    deckUrl,
    deckUsage,
    isFullscreen,
    containerRef,
    toggleFullscreen,
    handleStartPlanning,
    handleStartGenerating,
    startNewDeck,
    updateSlideTitle,
    changeSlideLayout,
    deleteSlide,
    addSlide,
    selectedCollection,
    setSelectedCollection,
    recommendedCollection,
    generatorType,
    setGeneratorType,
    gammaTheme,
    setGammaTheme,
    exportUrl,
    handleGenerateGamma,
  } = usePresentation({ title, content, isOpen, onClose });

  const activeCollectionName =
    selectedCollection && selectedCollection !== 'auto'
      ? selectedCollection
      : recommendedCollection || 'starter';

  const { data: previewsData } = useSlideTemplatePreviews(
    activeCollectionName,
    step === 'planned'
  );

  const previewMap = useMemo(() => {
    const map = new Map<string, string>();
    if (previewsData && Array.isArray(previewsData)) {
      for (const preview of previewsData) {
        if (preview.category && preview.url) {
          map.set(preview.category, preview.url);
        }
      }
    }
    return map;
  }, [previewsData]);

  const [isDownloadingPptx, setIsDownloadingPptx] = useState(false);
  const [iframeVersion, setIframeVersion] = useState(0);
  // Interactive item editor panel ("+ Add item" on generated slides)
  const [showItemEditor, setShowItemEditor] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasAiControlsRef = useRef<SlideCanvasAiControls | null>(null);
  const deckId = deckUrl ? deckUrl.split('/').pop() : undefined;

  const updateSlideHtml = useUpdateSlideHtml();
  const {
    selectedText: selectedAiText,
    scope: aiEditScope,
    isDialogOpen: isAiEditOpen,
    isPending: isAiEditing,
    selectTextElement: selectAiTextElement,
    clearSelection: clearAiTextSelection,
    openSelectedTextEdit,
    openImageEdit,
    openCurrentSlideEdit,
    handleOpenChange: handleAiEditOpenChange,
    submitEdit: submitAiEdit,
  } = useSlideAiEdit({ iframeRef, deckId });
  const {
    isActiveSlideDropped,
    droppedCount,
    syncDropState,
    toggleActiveSlideDropped,
    focusNextDroppedSlide,
  } = useSlideDrop({ iframeRef });

  const plannedSlidesRef = useRef(plannedSlides);
  useEffect(() => {
    plannedSlidesRef.current = plannedSlides;
  }, [plannedSlides]);

  /** Swap a re-rendered slide SVG into the preview iframe (namespacing its
   * ids so clipPaths/gradients don't collide with other slides). */
  const applySvgToPreviewSlide = useCallback(
    (index: number, svg: string) => {
      clearAiTextSelection();
      canvasAiControlsRef.current?.hide();
      const doc = iframeRef.current?.contentDocument;
      const target = doc?.querySelectorAll('.slide')?.[index];
      if (!doc || !target) {
        toast.error('Preview not ready — reload the deck and try again');
        return;
      }
      const prefix = `edit${index}x${Date.now().toString(36)}_`;
      const safe = sanitizeSvgMarkup(svg)
        .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
        .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
      const old = target.querySelector('svg');
      if (old) {
        old.outerHTML = safe;
      } else {
        target.innerHTML = safe;
      }
    },
    [clearAiTextSelection]
  );

  const handleEditorSlideChange = useCallback(
    (index: number) => {
      clearAiTextSelection();
      canvasAiControlsRef.current?.hide();
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const slides = doc.querySelectorAll('.slide');
        slides.forEach((s, k) => {
          s.classList.remove('active');
          if (k === index) {
            s.classList.add('active');
          }
        });
        const counter = doc.getElementById('counter');
        if (counter) {
          counter.textContent = `${index + 1} / ${slides.length}`;
        }
        syncDropState();
      }
    },
    [clearAiTextSelection, syncDropState]
  );
  const isGamma = !!deckUrl?.includes('gamma.app');

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // TanStack Query for slide templates
  const { data: collectionsData, isLoading: isLoadingTemplates } =
    useSlideTemplates();
  const collections = collectionsData || [];

  // Fetch active categories for the selected template collection
  const { data: categoriesData } = useSlideTemplateCategories(
    selectedCollection,
    isOpen && !!selectedCollection
  );
  const activeCategories = categoriesData?.categories || [];

  // TanStack Mutation for downloading PPTX
  const downloadPptx = useDownloadPptx();

  const handleDownloadPptx = async () => {
    if (!deckId) return;
    setIsDownloadingPptx(true);
    downloadPptx.mutate(deckId, {
      onSuccess: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation-${deckId}.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success(t('pptxDownloadSuccess'));
        setIsDownloadingPptx(false);
      },
      onError: (err: any) => {
        console.error(err);
        toast.error(t('pptxDownloadError'));
        setIsDownloadingPptx(false);
      },
    });
  };

  const enableVisualEditing = useCallback(() => {
    console.log('[VisualEditor] enableVisualEditing triggered');
    if (deckUrl?.includes('gamma.app')) {
      console.log(
        '[VisualEditor] Gamma presentation, skipping visual editor injection'
      );
      return;
    }
    try {
      const iframe = iframeRef.current;
      if (!iframe) {
        console.warn('[VisualEditor] Iframe ref is null');
        return;
      }

      const doc = iframe.contentDocument;
      if (!doc) {
        console.warn(
          '[VisualEditor] contentDocument is null (cross-origin or not loaded yet)'
        );
        return;
      }

      console.log(
        '[VisualEditor] Accessed iframe contentDocument successfully'
      );
      clearAiTextSelection();
      // Decks saved by the earlier implementation hid dropped slides outright,
      // which made them impossible to restore in the editor.
      removeLegacySlideDropStyles(doc);
      syncDropState();

      // Try to load plannedSlides from script tag in S3 HTML
      const metaEl = doc.querySelector('#slide-plan-metadata');
      console.log(metaEl, 'metaEl');
      if (metaEl) {
        try {
          const meta = JSON.parse(metaEl.textContent || '{}');
          if (Array.isArray(meta.slides) && meta.slides.length > 0) {
            if (plannedSlidesRef.current.length === 0) {
              console.log(
                '[VisualEditor] Restored plannedSlides from HTML metadata:',
                meta.slides
              );
              console.log(meta.slides, 'hello');
              setPlannedSlides(meta.slides);
            }
          }
        } catch (err) {
          console.error(
            '[VisualEditor] Failed to parse slide metadata script tag:',
            err
          );
        }
      }

      // Inject temporary styles for visual feedback on editable SVG text elements
      if (!doc.querySelector('style[data-slide-editor]')) {
        const style = doc.createElement('style');
        style.setAttribute('data-slide-editor', 'true');
        style.innerHTML = `
          text, tspan {
            transition: outline 0.15s ease-in-out;
            pointer-events: auto !important;
          }
          text:hover, tspan:hover {
            outline: 1px dashed rgba(59, 130, 246, 0.8) !important;
            cursor: text;
          }
          text[data-ai-selected="true"], tspan[data-ai-selected="true"] {
            outline: 2px solid rgba(139, 92, 246, 0.95) !important;
            outline-offset: 3px;
          }
          .slide[${SLIDE_DROP_ATTRIBUTE}="true"] svg {
            outline: 3px dashed rgba(239, 68, 68, 0.9) !important;
            opacity: 0.55;
          }
        `;
        doc.head.appendChild(style);
        console.log('[VisualEditor] Injected hover styles into iframe head');
      }

      canvasAiControlsRef.current?.cleanup();
      canvasAiControlsRef.current = attachSlideCanvasAiControls({
        document: doc,
        textActionLabel: t('canvasAiTextAction'),
        imageActionLabel: t('canvasAiImageAction'),
        onTextAction: (element) => {
          selectAiTextElement(element);
          openSelectedTextEdit();
        },
        onImageAction: openImageEdit,
        onActiveSlideChange: () => {
          clearAiTextSelection();
          syncDropState();
        },
      });

      const elements = getEditableSlideTextElements(doc);
      console.log(
        `[VisualEditor] Found ${elements.length} text/tspan elements in iframe`
      );

      // Select SVG text & tspan nodes and make them editable via clicking
      elements.forEach((el) => {
        if (el.getAttribute('data-has-click-listener') === 'true') return;
        el.setAttribute('data-has-click-listener', 'true');

        el.addEventListener('click', (e) => {
          console.log('[VisualEditor] Text element clicked:', el.textContent);
          e.stopPropagation();
          e.preventDefault();

          // Blur any active textareas first
          const activeTextarea = doc.querySelector(
            'textarea[data-active-editor="true"]'
          ) as HTMLTextAreaElement;
          if (activeTextarea) {
            activeTextarea.blur();
          }

          const textEl = el as SVGTextContentElement;
          selectAiTextElement(textEl);
          const rect = textEl.getBoundingClientRect();
          const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
          const scrollLeft =
            doc.documentElement.scrollLeft || doc.body.scrollLeft;

          // Position the textarea overlay directly over the text element
          const top = rect.top + scrollTop;
          const left = rect.left + scrollLeft;

          const textarea = doc.createElement('textarea');
          textarea.setAttribute('data-active-editor', 'true');

          // Extract styling
          const computedStyle = doc.defaultView?.getComputedStyle(textEl);
          const fontFamily = computedStyle?.fontFamily || 'sans-serif';
          const fontSize = computedStyle?.fontSize || '20px';
          const fontWeight = computedStyle?.fontWeight || 'normal';
          const fill = computedStyle?.fill || '#000000';

          Object.assign(textarea.style, {
            position: 'absolute',
            top: `${top - 4}px`,
            left: `${left - 6}px`,
            width: `${Math.max(120, rect.width + 20)}px`,
            height: `${Math.max(32, rect.height + 8)}px`,
            fontFamily,
            fontSize,
            fontWeight,
            color: fill,
            background: '#111827',
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            outline: 'none',
            zIndex: '99999',
            resize: 'none',
            padding: '2px 4px',
            lineHeight: '1.2',
            overflow: 'hidden',
          });

          textarea.value = textEl.textContent || '';
          doc.body.appendChild(textarea);
          textarea.focus();
          textarea.select();

          // Temporarily hide the original node
          textEl.style.visibility = 'hidden';

          const finishEditing = () => {
            textEl.textContent = textarea.value;
            textEl.style.visibility = 'visible';
            textarea.remove();
          };

          textarea.addEventListener('blur', finishEditing);
          textarea.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' && !evt.shiftKey) {
              evt.preventDefault();
              textarea.blur();
            } else if (evt.key === 'Escape') {
              textarea.value = textEl.textContent || '';
              textarea.blur();
            }
          });
        });
      });
    } catch (err) {
      console.error('[VisualEditor] Error in enableVisualEditing:', err);
    }
  }, [
    clearAiTextSelection,
    deckUrl,
    openImageEdit,
    openSelectedTextEdit,
    selectAiTextElement,
    setPlannedSlides,
    syncDropState,
    t,
  ]);

  // Manually attach load listeners and check document status to guarantee visual editing binds
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log(
        '[VisualEditor] Iframe load event fired (useEffect listener)'
      );
      enableVisualEditing();
    };

    // If iframe is already loaded, enable it directly
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.readyState === 'complete') {
        console.log(
          '[VisualEditor] Iframe already fully loaded, enabling visual editing immediately'
        );
        enableVisualEditing();
      }
    } catch (err) {
      console.warn('[VisualEditor] Cross-origin error or document busy:', err);
    }

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      canvasAiControlsRef.current?.cleanup();
      canvasAiControlsRef.current = null;
    };
  }, [enableVisualEditing]);

  // Clones the current visual iframe layout, strips visual editor traits,
  // and saves the raw serialized HTML back to S3.
  const handleSaveVisualEdits = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !deckId) return;

    // Flush any currently open editor
    const activeTextarea = doc.querySelector(
      'textarea[data-active-editor="true"]'
    ) as HTMLTextAreaElement;
    if (activeTextarea) {
      activeTextarea.blur();
    }

    // Clone root layout
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;

    // Clean up temporary editor and AI-control attributes
    clone.querySelectorAll('[data-has-click-listener]').forEach((el) => {
      el.removeAttribute('data-has-click-listener');
    });
    clone.querySelectorAll('[data-ai-selected]').forEach((el) => {
      el.removeAttribute('data-ai-selected');
    });

    // Remove injected editor styles and contextual AI controls
    clone
      .querySelectorAll(
        'style[data-slide-editor], style[data-slide-ai-controls], [data-slide-ai-action]'
      )
      .forEach((el) => {
        el.remove();
      });

    // Strip stray editors
    clone.querySelectorAll('textarea[data-active-editor]').forEach((el) => {
      el.remove();
    });

    // Embed the latest plannedSlides metadata JSON into the HTML file
    let metaEl = clone.querySelector('#slide-plan-metadata');
    if (!metaEl) {
      metaEl = doc.createElement('script');
      metaEl.id = 'slide-plan-metadata';
      metaEl.setAttribute('type', 'application/json');
      const body = clone.querySelector('body');
      if (body) {
        body.appendChild(metaEl);
      } else {
        clone.appendChild(metaEl);
      }
    }
    metaEl.textContent = JSON.stringify({ slides: plannedSlidesRef.current });

    // Persist dropped-slide behavior: hide them and skip them while presenting.
    applySlideDropRuntime(clone, doc);

    const html = `<!DOCTYPE html>\n${clone.outerHTML}`;

    updateSlideHtml.mutate(
      { deckId, html },
      {
        onSuccess: () => {
          setIframeVersion((v) => v + 1);
          toast.success(t('visualSaveSuccess'));
        },
      }
    );
  };

  // Dynamic layout renderer for presentation view mode
  const renderSlideContent = (slide: PlannedSlide) => {
    const { layoutType, slideTitle, bindings = {} } = slide;

    switch (layoutType) {
      case 'TITLE_SLIDE':
        return (
          <div className="flex h-full min-h-[30vh] flex-col items-center justify-center py-6 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_60%)]" />
            <h1 className="mb-6 font-extrabold text-3xl text-foreground tracking-tight md:text-4xl lg:text-5xl">
              {slideTitle}
            </h1>
            {bindings.subtitle && (
              <p className="mb-8 max-w-2xl font-medium text-base text-muted-foreground leading-relaxed md:text-lg">
                {bindings.subtitle}
              </p>
            )}
            {bindings.author && (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 font-semibold text-primary text-xs uppercase tracking-wide">
                {bindings.author}
              </div>
            )}
          </div>
        );

      case 'AGENDA_OUTLINE':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.isArray(bindings.items) &&
                bindings.items.map((item: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-accent/30"
                  >
                    <span className="font-extrabold text-lg text-primary/80">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="font-semibold text-foreground text-sm leading-snug">
                      {item}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        );

      case 'SECTION_HEADER':
        return (
          <div className="flex h-full min-h-[30vh] flex-col items-center justify-center py-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--accent)_12%,transparent),transparent_60%)]" />
            <span className="mb-4 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-extrabold text-[10px] text-primary uppercase tracking-widest">
              Next Module
            </span>
            <h1 className="mb-4 font-extrabold text-2xl text-foreground tracking-wide md:text-4xl">
              {slideTitle}
            </h1>
            {bindings.sub_module_name && (
              <div className="mt-2 font-semibold text-lg text-muted-foreground italic">
                {bindings.sub_module_name}
              </div>
            )}
          </div>
        );

      case 'TITLE_BULLETS':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <ul className="max-w-3xl space-y-4">
              {Array.isArray(bindings.bullets) &&
                bindings.bullets.map((bullet: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary text-xs">
                      ✓
                    </span>
                    <span className="font-medium text-sm leading-relaxed md:text-base">
                      {bullet}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        );

      case 'TWO_COLUMN_SPLIT':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <h3 className="mb-3 border-border border-b pb-2 font-bold text-foreground text-sm">
                  {bindings.left_col_title || 'Column A'}
                </h3>
                <ul className="space-y-2.5">
                  {Array.isArray(bindings.left_col_text) &&
                    bindings.left_col_text.map(
                      (bullet: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-muted-foreground text-xs"
                        >
                          <span className="mt-0.5 text-primary">•</span>
                          <span className="font-medium leading-relaxed">
                            {bullet}
                          </span>
                        </li>
                      )
                    )}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <h3 className="mb-3 border-border border-b pb-2 font-bold text-foreground text-sm">
                  {bindings.right_col_title || 'Column B'}
                </h3>
                <ul className="space-y-2.5">
                  {Array.isArray(bindings.right_col_text) &&
                    bindings.right_col_text.map(
                      (bullet: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-muted-foreground text-xs"
                        >
                          <span className="mt-0.5 text-primary">•</span>
                          <span className="font-medium leading-relaxed">
                            {bullet}
                          </span>
                        </li>
                      )
                    )}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'BIG_QUOTE_TAKEAWAY':
        return (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-6 text-center">
            <span className="select-none font-serif text-4xl text-primary/30 leading-none">
              “
            </span>
            <blockquote className="-mt-3 mb-6 font-medium text-foreground text-lg italic leading-relaxed md:text-xl lg:text-2xl">
              {bindings.quote}
            </blockquote>
            <span className="-mt-3 select-none font-serif text-4xl text-primary/30 leading-none">
              ”
            </span>
            {bindings.author_or_source && (
              <cite className="block border-border border-t px-6 pt-3 font-bold text-[10px] text-muted-foreground uppercase not-italic tracking-widest">
                {bindings.author_or_source}
              </cite>
            )}
          </div>
        );

      case 'KPI_BIG_NUMBER':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="flex flex-wrap justify-around gap-6">
              {Array.isArray(bindings.metrics) &&
                bindings.metrics.map((metric: any, index: number) => (
                  <div
                    key={index}
                    className="min-w-37.5 flex-1 rounded-2xl border border-border bg-muted/30 p-5 text-center shadow-inner"
                  >
                    <div className="mb-2 font-extrabold text-3xl text-primary md:text-5xl">
                      {metric.value}
                    </div>
                    <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                      {metric.label}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );

      case 'CHART_INSIGHT':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-5">
              <div className="flex h-40 flex-col justify-center rounded-2xl border border-border bg-muted/40 p-5 md:col-span-3">
                <span className="mb-3 block font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Data Projection ({bindings.chart_type || 'bar'} chart)
                </span>
                <div className="flex h-20 items-end justify-around gap-2">
                  {Array.isArray(bindings.chart_data) &&
                    bindings.chart_data.map((item: any, idx: number) => {
                      const maxVal = Math.max(
                        ...(bindings.chart_data
                          .map((d: any) => parseChartMagnitude(d.value))
                          .filter(
                            (value: number | null): value is number =>
                              typeof value === 'number' &&
                              Number.isFinite(value)
                          ) || [1]),
                        1
                      );
                      const magnitude = parseChartMagnitude(item.value) || 0;
                      const heightPct = Math.min(
                        100,
                        Math.max(10, (magnitude / maxVal) * 100)
                      );
                      return (
                        <div
                          key={idx}
                          className="flex flex-1 flex-col items-center"
                        >
                          <div
                            className="w-full max-w-5 rounded-t bg-linear-to-t from-primary/40 to-primary transition-all duration-500"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="mt-1.5 max-w-full truncate font-bold text-[9px] text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="max-w-full truncate font-semibold text-[9px] text-primary">
                            {getChartDisplayValue(item)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="rounded-xl border border-input border-dashed bg-accent/10 p-4">
                  <span className="mb-1.5 block font-extrabold text-[10px] text-primary uppercase tracking-widest">
                    Strategic Insight
                  </span>
                  <p className="font-medium text-muted-foreground text-xs leading-relaxed md:text-sm">
                    {bindings.insight_text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'DATA_TABLE':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-muted-foreground text-xs">
                <thead className="bg-muted font-bold text-[10px] text-foreground uppercase tracking-wider">
                  <tr>
                    {Array.isArray(bindings.headers) &&
                      bindings.headers.map((h: string, idx: number) => (
                        <th
                          key={idx}
                          className="border-border border-b px-4 py-2.5"
                        >
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-muted/20">
                  {Array.isArray(bindings.rows) &&
                    bindings.rows.map((row: string[], idx: number) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-accent/20"
                      >
                        {row.map((cell: string, cellIdx: number) => (
                          <td key={cellIdx} className="px-4 py-2.5">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'MEDIA_TEXT':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              <div className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-input border-dashed bg-muted/30 p-5 text-center">
                <div className="absolute inset-0 bg-linear-to-t from-accent/10 to-transparent" />
                <span className="z-10 mb-1 font-bold text-[10px] text-primary/80 uppercase tracking-widest">
                  Suggested Visual Asset
                </span>
                <p className="z-10 max-w-xs font-medium text-[10px] text-muted-foreground leading-relaxed">
                  "{bindings.image_prompt_description}"
                </p>
                <div className="z-10 mt-3 rounded-full border border-border bg-background/80 px-3 py-0.5 font-semibold text-[9px] text-muted-foreground uppercase tracking-wider">
                  AI Image Generator Prompt
                </div>
              </div>
              <div className="font-medium text-muted-foreground text-xs leading-relaxed md:text-sm">
                {bindings.body_text}
              </div>
            </div>
          </div>
        );

      case 'TIMELINE_MILESTONES':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="relative ml-2 space-y-4 border-primary/20 border-l-2 pl-5">
              {Array.isArray(bindings.events) &&
                bindings.events.map((event: any, index: number) => (
                  <div key={index} className="relative">
                    <span className="absolute top-1.5 -left-6.75 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-primary bg-background text-primary" />
                    <div>
                      <span className="mb-0.5 inline-block rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-extrabold text-[9px] text-primary uppercase">
                        {event.date_or_step}
                      </span>
                      <p className="font-semibold text-foreground text-xs leading-snug">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );

      case 'STEP_BY_STEP':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {Array.isArray(bindings.steps) &&
                bindings.steps.map((stepItem: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3.5 rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:bg-accent/30"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-extrabold text-primary text-xs">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-foreground text-xs leading-snug">
                      {stepItem}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        );

      case 'CONCLUSION_SUMMARY':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="max-w-3xl space-y-3">
              {Array.isArray(bindings.summary_points) &&
                bindings.summary_points.map((point: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary text-xs">
                      ✓
                    </span>
                    <span className="font-semibold text-muted-foreground text-sm leading-relaxed">
                      {point}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        );

      case 'CALL_TO_ACTION':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5 md:p-6">
              <span className="mb-2.5 block font-extrabold text-[10px] text-accent uppercase tracking-widest">
                Assignment / Next Steps
              </span>
              <ul className="space-y-3">
                {Array.isArray(bindings.action_items) &&
                  bindings.action_items.map((item: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-muted-foreground"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-accent/20 bg-background/80 font-bold text-accent text-xs">
                        [ ]
                      </span>
                      <span className="font-semibold text-sm leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        );

      case 'REFERENCES_LIST':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-border border-b pb-3 font-extrabold text-foreground text-xl md:text-2xl">
              {slideTitle}
            </h2>
            <div className="grid max-h-[50vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
              {Array.isArray(bindings.sources) &&
                bindings.sources.map(
                  (
                    source: { title: string; url: string; summary?: string },
                    index: number
                  ) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 transition-all duration-200 hover:bg-accent/20 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-bold text-primary text-xs">
                          {index + 1}
                        </span>
                        <span className="line-clamp-1 font-bold text-foreground text-sm leading-snug transition-colors group-hover:text-primary">
                          {source.title || 'Untitled Reference'}
                        </span>
                      </div>
                      {source.summary && (
                        <p className="line-clamp-2 pl-8 font-normal text-muted-foreground text-xs leading-relaxed">
                          {source.summary}
                        </p>
                      )}
                      <span className="truncate pl-8 font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
                        {source.url}
                      </span>
                    </a>
                  )
                )}
            </div>
          </div>
        );

      case 'QA_CONTACT':
        return (
          <div className="flex h-full min-h-[30vh] flex-col items-center justify-center py-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_60%)]" />
            <h1 className="mb-6 font-extrabold text-3xl text-foreground tracking-tight md:text-4xl">
              Questions & Answers
            </h1>
            {bindings.footer_note && (
              <p className="mb-4 max-w-xl font-medium text-muted-foreground text-sm italic leading-relaxed md:text-base">
                "{bindings.footer_note}"
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 font-semibold text-[9px] text-muted-foreground uppercase tracking-wider">
              Thank you for participating!
            </div>
          </div>
        );

      default:
        return (
          <div className="py-2 text-left">
            <h2 className="mb-4 font-extrabold text-foreground text-lg">
              {slideTitle}
            </h2>
            <pre className="overflow-auto rounded-xl border border-border bg-card p-4 text-muted-foreground text-xs">
              {JSON.stringify(bindings, null, 2)}
            </pre>
          </div>
        );
    }
  };

  // Dynamic layout bindings form editor in planned mode
  const renderBindingsEditor = (slide: PlannedSlide, idx: number) => {
    const { layoutType, bindings = {} } = slide;

    const updateBinding = (key: string, value: any) => {
      setPlannedSlides((prev) =>
        prev.map((s, i) =>
          i === idx
            ? {
                ...s,
                bindings: normalizeSlideBindings(layoutType, slide.slideTitle, {
                  ...s.bindings,
                  [key]: value,
                }),
              }
            : s
        )
      );
    };

    switch (layoutType) {
      case 'TITLE_SLIDE':
        return (
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Subtitle
              </span>
              <Input
                value={bindings.subtitle || ''}
                onChange={(e) => updateBinding('subtitle', e.target.value)}
                placeholder="Slide Subtitle"
                className="h-10 rounded-xl border-input bg-card text-foreground text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Author / Info
              </span>
              <Input
                value={bindings.author || ''}
                onChange={(e) => updateBinding('author', e.target.value)}
                placeholder="Author / Date info"
                className="h-10 rounded-xl border-input bg-card text-foreground text-sm"
              />
            </div>
          </div>
        );

      case 'SECTION_HEADER':
        return (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
              Sub-module Name
            </span>
            <Input
              value={bindings.sub_module_name || ''}
              onChange={(e) => updateBinding('sub_module_name', e.target.value)}
              placeholder="Sub-module or Section name"
              className="h-10 rounded-xl border-input bg-card px-4 text-foreground text-sm"
            />
          </div>
        );

      case 'BIG_QUOTE_TAKEAWAY':
        return (
          <div className="mt-2 space-y-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Quote Text
              </span>
              <Textarea
                value={bindings.quote || ''}
                onChange={(e) => updateBinding('quote', e.target.value)}
                placeholder="Important quote..."
                className="h-20 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Author or Source
              </span>
              <Input
                value={bindings.author_or_source || ''}
                onChange={(e) =>
                  updateBinding('author_or_source', e.target.value)
                }
                placeholder="Leonardo da Vinci, etc."
                className="h-10 rounded-xl border-input bg-card px-4 text-foreground text-sm"
              />
            </div>
          </div>
        );

      case 'MEDIA_TEXT':
        return (
          <div className="mt-2 space-y-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Suggested Visual Prompt Description
              </span>
              <Textarea
                value={bindings.image_prompt_description || ''}
                onChange={(e) =>
                  updateBinding('image_prompt_description', e.target.value)
                }
                placeholder="E.g., A clean workflow flow diagram representing data architecture..."
                className="h-20 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Body Text
              </span>
              <Textarea
                value={bindings.body_text || ''}
                onChange={(e) => updateBinding('body_text', e.target.value)}
                placeholder="Body detail explanation..."
                className="h-20 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
              />
            </div>
          </div>
        );

      case 'REFERENCES_LIST': {
        const sources = Array.isArray(bindings.sources) ? bindings.sources : [];
        return (
          <div className="mt-2 flex flex-col gap-3">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('referenceSources')}
            </span>
            <div className="flex max-h-64 flex-col gap-2.5 overflow-y-auto pr-1">
              {sources.map(
                (
                  src: { title: string; url: string; summary?: string },
                  index: number
                ) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 p-2.5"
                  >
                    <div className="grid flex-1 grid-cols-1 gap-2">
                      <Input
                        value={src.title || ''}
                        onChange={(e) => {
                          const updated = [...sources];
                          updated[index] = { ...src, title: e.target.value };
                          updateBinding('sources', updated);
                        }}
                        placeholder={t('titlePlaceholder')}
                        className="h-8 rounded-lg border-input bg-card px-2.5 text-foreground text-xs"
                      />
                      <Input
                        value={src.url || ''}
                        onChange={(e) => {
                          const updated = [...sources];
                          updated[index] = { ...src, url: e.target.value };
                          updateBinding('sources', updated);
                        }}
                        placeholder={t('urlPlaceholder')}
                        className="h-8 rounded-lg border-input bg-card px-2.5 font-mono text-foreground text-xs"
                      />
                      <Input
                        value={src.summary || ''}
                        onChange={(e) => {
                          const updated = [...sources];
                          updated[index] = { ...src, summary: e.target.value };
                          updateBinding('sources', updated);
                        }}
                        placeholder={t('summaryPlaceholder')}
                        className="h-8 rounded-lg border-input bg-card px-2.5 text-foreground text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updated = sources.filter(
                          (_, idx) => idx !== index
                        );
                        updateBinding('sources', updated);
                      }}
                      className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const updated = [
                  ...sources,
                  { title: '', url: '', summary: '' },
                ];
                updateBinding('sources', updated);
              }}
              className="mt-1 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('addReference')}
            </Button>
          </div>
        );
      }

      case 'QA_CONTACT':
        return (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
              Footer Closing Note
            </span>
            <Textarea
              value={bindings.footer_note || ''}
              onChange={(e) => updateBinding('footer_note', e.target.value)}
              placeholder="E.g., Thank you! Feel free to raise questions."
              className="h-16 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
            />
          </div>
        );

      case 'AGENDA_OUTLINE':
      case 'TITLE_BULLETS':
      case 'STEP_BY_STEP':
      case 'CONCLUSION_SUMMARY':
      case 'CALL_TO_ACTION': {
        const listKey =
          layoutType === 'AGENDA_OUTLINE'
            ? 'items'
            : layoutType === 'TITLE_BULLETS'
              ? 'bullets'
              : layoutType === 'STEP_BY_STEP'
                ? 'steps'
                : layoutType === 'CONCLUSION_SUMMARY'
                  ? 'summary_points'
                  : 'action_items';
        const arr = Array.isArray(bindings[listKey]) ? bindings[listKey] : [];
        return (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
              List Items (One per line)
            </span>
            <Textarea
              value={arr.join('\n')}
              onChange={(e) =>
                updateBinding(listKey, e.target.value.split('\n'))
              }
              placeholder="Item 1&#10;Item 2&#10;Item 3"
              className="h-28 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
            />
          </div>
        );
      }

      case 'TWO_COLUMN_SPLIT': {
        const leftArr = Array.isArray(bindings.left_col_text)
          ? bindings.left_col_text
          : [];
        const rightArr = Array.isArray(bindings.right_col_text)
          ? bindings.right_col_text
          : [];
        return (
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Left Column Title
                </span>
                <Input
                  value={bindings.left_col_title || ''}
                  onChange={(e) =>
                    updateBinding('left_col_title', e.target.value)
                  }
                  placeholder="Column title..."
                  className="h-10 rounded-xl border-input bg-card px-4 text-foreground text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Left Column Items (One per line)
                </span>
                <Textarea
                  value={leftArr.join('\n')}
                  onChange={(e) =>
                    updateBinding('left_col_text', e.target.value.split('\n'))
                  }
                  placeholder="Detail 1&#10;Detail 2"
                  className="h-24 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Right Column Title
                </span>
                <Input
                  value={bindings.right_col_title || ''}
                  onChange={(e) =>
                    updateBinding('right_col_title', e.target.value)
                  }
                  placeholder="Column title..."
                  className="h-10 rounded-xl border-input bg-card px-4 text-foreground text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Right Column Items (One per line)
                </span>
                <Textarea
                  value={rightArr.join('\n')}
                  onChange={(e) =>
                    updateBinding('right_col_text', e.target.value.split('\n'))
                  }
                  placeholder="Detail 1&#10;Detail 2"
                  className="h-24 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'KPI_BIG_NUMBER': {
        const metrics = Array.isArray(bindings.metrics) ? bindings.metrics : [];
        const updateMetric = (
          idx: number,
          field: 'value' | 'label',
          val: string
        ) => {
          const updated = [...metrics];
          if (!updated[idx]) updated[idx] = { value: '', label: '' };
          updated[idx] = {
            ...updated[idx],
            [field]: val,
          };
          updateBinding('metrics', updated);
        };
        return (
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <span className="block font-bold text-[10px] text-muted-foreground">
                Metric 1
              </span>
              <Input
                value={metrics[0]?.value || ''}
                onChange={(e) => updateMetric(0, 'value', e.target.value)}
                placeholder="E.g., 98% or 10M+"
                className="h-9 rounded-xl border-input bg-card px-3 text-foreground text-sm"
              />
              <Input
                value={metrics[0]?.label || ''}
                onChange={(e) => updateMetric(0, 'label', e.target.value)}
                placeholder="Label (E.g., Accuracy)"
                className="h-9 rounded-xl border-input bg-card px-3 text-foreground text-sm"
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <span className="block font-bold text-[10px] text-muted-foreground">
                Metric 2
              </span>
              <Input
                value={metrics[1]?.value || ''}
                onChange={(e) => updateMetric(1, 'value', e.target.value)}
                placeholder="E.g., 45ms or $1.2B"
                className="h-9 rounded-xl border-input bg-card px-3 text-foreground text-sm"
              />
              <Input
                value={metrics[1]?.label || ''}
                onChange={(e) => updateMetric(1, 'label', e.target.value)}
                placeholder="Label (E.g., Query latency)"
                className="h-9 rounded-xl border-input bg-card px-3 text-foreground text-sm"
              />
            </div>
          </div>
        );
      }

      case 'CHART_INSIGHT': {
        const chartData = Array.isArray(bindings.chart_data)
          ? bindings.chart_data
          : [];
        const chartDataStr = chartData
          .map(
            (d: any) =>
              `${d.label}:${d.value}${d.display_value ? `|${d.display_value}` : ''}`
          )
          .join('\n');
        const updateChartData = (val: string) => {
          const parsedData = val
            .split('\n')
            .map((line) => {
              const [chartPart, displayPart] = line.split('|');
              const separatorIndex = chartPart.indexOf(':');
              const label =
                separatorIndex >= 0
                  ? chartPart.slice(0, separatorIndex)
                  : chartPart;
              const rawValue =
                separatorIndex >= 0 ? chartPart.slice(separatorIndex + 1) : '';
              if (!label) return null;
              const trimmedDisplay = displayPart?.trim() || '';
              const trimmedRawValue = rawValue.trim();
              return {
                label: label.trim(),
                value: parseChartMagnitude(trimmedRawValue) ?? 0,
                ...(trimmedDisplay
                  ? { display_value: trimmedDisplay }
                  : trimmedRawValue && Number.isNaN(Number(trimmedRawValue))
                    ? { display_value: trimmedRawValue }
                    : {}),
              };
            })
            .filter(Boolean);
          updateBinding('chart_data', parsedData);
        };
        return (
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Chart Type
                </span>
                <Select
                  value={bindings.chart_type || 'bar'}
                  onValueChange={(val) => updateBinding('chart_type', val)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-input bg-card text-foreground text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Chart Data (Label:Value|Display, one per line)
                </span>
                <Textarea
                  value={chartDataStr}
                  onChange={(e) => updateChartData(e.target.value)}
                  placeholder="Mode:4|4.0/5&#10;Dissatisfaction:1.5|1-2 low&#10;Variance Focus:4|High"
                  className="h-24 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Insight Explanation
              </span>
              <Textarea
                value={bindings.insight_text || ''}
                onChange={(e) => updateBinding('insight_text', e.target.value)}
                placeholder="Visual analytics insights..."
                className="h-full min-h-35 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
              />
            </div>
          </div>
        );
      }

      case 'DATA_TABLE': {
        const headers = Array.isArray(bindings.headers) ? bindings.headers : [];
        const rows = Array.isArray(bindings.rows) ? bindings.rows : [];
        const rowsStr = rows.map((r: string[]) => r.join(',')).join('\n');
        return (
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Headers (comma-separated)
              </span>
              <Input
                value={headers.join(', ')}
                onChange={(e) =>
                  updateBinding(
                    'headers',
                    e.target.value.split(',').map((s) => s.trim())
                  )
                }
                placeholder="Heading 1, Heading 2"
                className="h-10 rounded-xl border-input bg-card px-4 text-foreground text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Rows (cols comma-separated, one row per line)
              </span>
              <Textarea
                value={rowsStr}
                onChange={(e) =>
                  updateBinding(
                    'rows',
                    e.target.value
                      .split('\n')
                      .map((line) => line.split(',').map((c) => c.trim()))
                  )
                }
                placeholder="Row1Col1, Row1Col2&#10;Row2Col1, Row2Col2"
                className="h-20 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
              />
            </div>
          </div>
        );
      }

      case 'TIMELINE_MILESTONES': {
        const events = Array.isArray(bindings.events) ? bindings.events : [];
        const eventsStr = events
          .map((ev: any) => `${ev.date_or_step}:${ev.description}`)
          .join('\n');
        const updateEvents = (val: string) => {
          const parsedEvents = val
            .split('\n')
            .map((line) => {
              const [dateStr, desc] = line.split(':');
              if (!dateStr) return null;
              return {
                date_or_step: dateStr.trim(),
                description: desc?.trim() || '',
              };
            })
            .filter(Boolean);
          updateBinding('events', parsedEvents);
        };
        return (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
              Events List (Date/Step:Description, one per line)
            </span>
            <Textarea
              value={eventsStr}
              onChange={(e) => updateEvents(e.target.value)}
              placeholder="Phase 1:Setup project configuration&#10;Phase 2:Release production build"
              className="h-28 resize-none rounded-xl border-input bg-card px-4 py-2 text-foreground text-sm"
            />
          </div>
        );
      }

      default:
        return (
          <RawBindingsEditor
            bindings={bindings}
            onChangeBindings={(newBindings) => {
              setPlannedSlides((prev) =>
                prev.map((s, i) =>
                  i === idx
                    ? {
                        ...s,
                        bindings: newBindings,
                      }
                    : s
                )
              );
            }}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative m-0 flex min-h-[75vh] w-full select-none flex-col justify-between overflow-hidden rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-accent/10 p-6 text-foreground shadow-xl md:p-10',
        isFullscreen &&
          'fixed inset-0 z-99 m-0 h-screen w-screen rounded-none border-none'
      )}
    >
      {/* Top progress bar */}
      {step === 'generated' && !deckUrl && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-border/80">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${((currentSlideIndex + 1) / plannedSlides.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-border border-b pb-4">
        <div>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary text-xs uppercase tracking-wider">
            {t('title')}
          </span>
          <h2 className="mt-2 max-w-md truncate font-bold text-foreground text-lg md:max-w-xl lg:max-w-2xl">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {step === 'generated' && deckUrl && (
            <>
              {!isGamma && selectedAiText && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg border-primary/30 text-primary"
                  onClick={openSelectedTextEdit}
                  disabled={isAiEditing}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('btnAiEditText')}
                </Button>
              )}
              {!isGamma && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg"
                  onClick={openCurrentSlideEdit}
                  disabled={isAiEditing}
                >
                  <Sparkles className="h-4 w-4" />
                  {t('btnAiEditSlide')}
                </Button>
              )}
              {!isGamma && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 gap-1.5 rounded-lg',
                    isActiveSlideDropped &&
                      'border-destructive/40 text-destructive'
                  )}
                  onClick={toggleActiveSlideDropped}
                  title={
                    droppedCount > 0
                      ? t('droppedSlidesCount', { count: droppedCount })
                      : undefined
                  }
                >
                  {isActiveSlideDropped ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  {isActiveSlideDropped
                    ? t('btnRestoreSlide')
                    : t('btnDropSlide')}
                </Button>
              )}
              {!isGamma && droppedCount > 0 && !isActiveSlideDropped && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg text-muted-foreground"
                  onClick={focusNextDroppedSlide}
                >
                  <EyeOff className="h-4 w-4" />
                  {t('btnReviewDroppedSlides', { count: droppedCount })}
                </Button>
              )}
              {!isGamma && (
                <Button
                  variant={showItemEditor ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg"
                  onClick={() => setShowItemEditor((v) => !v)}
                >
                  <ListPlus className="h-4 w-4" />
                  {t('btnEditItems')}
                </Button>
              )}
              {!isGamma && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={handleSaveVisualEdits}
                  disabled={updateSlideHtml.isPending || isAiEditing}
                >
                  <Save className="h-4 w-4" />
                  {updateSlideHtml.isPending
                    ? t('savingHtml')
                    : t('btnSaveVisual')}
                </Button>
              )}
              <PresentationExportActions
                exportUrl={exportUrl}
                isDownloading={isDownloadingPptx}
                isGamma={isGamma}
                lessonId={lessonId}
                onDownloadNative={handleDownloadPptx}
                t={t}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg"
                onClick={startNewDeck}
              >
                <Sparkles className="h-4 w-4" />
                {t('btnNewDeck')}
              </Button>
            </>
          )}
          {step === 'generated' && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg text-muted-foreground"
              onClick={toggleFullscreen}
              title={t('fullscreen')}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
            title={t('close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {step === 'input' && (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6">
          <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-2xl backdrop-blur-md md:p-8">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-foreground text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('title')}
            </h3>
            <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
              {t('inputDesc')}
            </p>

            {/* Generator Mode Tabs */}
            <div className="mb-6 flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setGeneratorType('default')}
                className={cn(
                  'flex-1 rounded-lg py-2 text-center font-semibold text-xs transition-all',
                  generatorType === 'default'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('tabSystem')}
              </button>
              <button
                type="button"
                onClick={() => setGeneratorType('gamma')}
                className={cn(
                  'flex-1 rounded-lg py-2 text-center font-semibold text-xs transition-all',
                  generatorType === 'gamma'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('tabGamma')}
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={500}
                  placeholder={t('inputPlaceholder')}
                  className="h-36 w-full resize-none rounded-xl border-input bg-muted/30 p-4 pb-8 font-sans text-foreground"
                />
                <span className="absolute right-4 bottom-3 select-none font-medium text-muted-foreground text-xs">
                  {instructions.length} / 500
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t('durationLabel')}
                </span>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="flex h-11 w-full justify-between rounded-xl border-input bg-muted/30 px-4 py-2.5 text-foreground text-sm">
                    <SelectValue placeholder={t('duration15')} />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="5"
                    >
                      {t('duration5')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="10"
                    >
                      {t('duration10')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="15"
                    >
                      {t('duration15')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="30"
                    >
                      {t('duration30')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="45"
                    >
                      {t('duration45')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="60"
                    >
                      {t('duration60')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="90"
                    >
                      {t('duration90')}
                    </SelectItem>
                    <SelectItem
                      className={selectItemHighlightClassName}
                      value="120"
                    >
                      {t('duration120')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {generatorType === 'default' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Template Style
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="flex items-center gap-1 font-semibold text-primary text-xs hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      Manage Styles
                    </button>
                  </div>
                  <Select
                    value={selectedCollection}
                    onValueChange={setSelectedCollection}
                  >
                    <SelectTrigger className="flex h-11 w-full justify-between rounded-xl border-input bg-muted/30 px-4 py-2.5 text-foreground text-sm">
                      <SelectValue placeholder="System Default (Starter)" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      <SelectItem
                        className={selectItemHighlightClassName}
                        value="auto"
                      >
                        ✨ Auto — AI picks from content
                      </SelectItem>
                      <SelectItem
                        className={selectItemHighlightClassName}
                        value="starter"
                      >
                        System Default (Starter)
                      </SelectItem>
                      {collections
                        .filter((c) => c.name !== 'starter')
                        .map((c) => (
                          <SelectItem
                            key={c.name}
                            className={selectItemHighlightClassName}
                            value={c.name}
                          >
                            {c.name === 'neon_dark'
                              ? 'Neon Dark Theme'
                              : c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {generatorType === 'gamma' && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {t('gammaThemeLabel')}
                  </span>
                  <Select value={gammaTheme} onValueChange={setGammaTheme}>
                    <SelectTrigger className="flex h-11 w-full justify-between rounded-xl border-input bg-muted/30 px-4 py-2.5 text-foreground text-sm">
                      <SelectValue placeholder={t('themeAuto')} />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      <SelectItem
                        className={selectItemHighlightClassName}
                        value="auto"
                      >
                        {t('themeAuto')}
                      </SelectItem>
                      <SelectItem
                        className={selectItemHighlightClassName}
                        value="light"
                      >
                        {t('themeLight')}
                      </SelectItem>
                      <SelectItem
                        className={selectItemHighlightClassName}
                        value="dark"
                      >
                        {t('themeDark')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <span className="mb-2 block font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t('suggestLabel')}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest1'))}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-accent/20"
                  >
                    {t('suggest1')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest2'))}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-accent/20"
                  >
                    {t('suggest2')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest3'))}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-accent/20"
                  >
                    {t('suggest3')}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-border border-t pt-6">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-muted-foreground"
              >
                Cancel
              </Button>
              {generatorType === 'default' ? (
                <Button
                  onClick={handleStartPlanning}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {t('btnPlan')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateGamma}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {t('btnGenerateGamma')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'planning' && (
        <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-md" />
            <Spinner className="h-12 w-12 text-primary" />
          </div>
          <h3 className="mb-2 font-bold text-foreground text-xl">
            {t('planningText')}
          </h3>
          <p className="text-muted-foreground text-sm">
            Please wait while the slide structures and layout content bindings
            are compiled.
          </p>
        </div>
      )}

      {step === 'planned' && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-2 py-4">
          <div className="mb-6 flex shrink-0 flex-col items-start justify-between gap-4 border-border border-b pb-4 md:flex-row md:items-center">
            <div>
              <h3 className="font-bold text-foreground text-xl">
                {t('plannedTitle')}
              </h3>
              <p className="mt-1 text-muted-foreground text-xs">
                {t('plannedDesc')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5">
                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Style:
                </span>
                <span
                  className="block max-w-37.5 truncate font-bold text-foreground text-xs"
                  title={
                    selectedCollection === 'auto'
                      ? `Auto — AI picked${recommendedCollection ? `: ${recommendedCollection}` : ' (decided at planning)'}`
                      : selectedCollection === 'starter'
                        ? 'Default Starter'
                        : selectedCollection === 'neon_dark'
                          ? 'Neon Dark Theme'
                          : selectedCollection
                  }
                >
                  {selectedCollection === 'auto'
                    ? `✨ Auto${recommendedCollection ? ` → ${recommendedCollection}` : ''}`
                    : selectedCollection === 'starter'
                      ? 'Default Starter'
                      : selectedCollection === 'neon_dark'
                        ? 'Neon Dark Theme'
                        : selectedCollection}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="h-9 gap-1.5 rounded-lg px-3"
              >
                <Plus className="h-4 w-4" />
                Choose Template style
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('input')}
                className="h-9 rounded-lg px-3"
              >
                {t('btnBack')}
              </Button>
              <Button
                size="sm"
                onClick={handleStartGenerating}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t('btnGenerate')}
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[50vh] flex-1 space-y-6 overflow-y-auto pr-1">
            {plannedSlides.map((slide, idx) => (
              <div
                key={slide.id}
                className="relative rounded-2xl border border-border bg-card p-5 shadow-lg backdrop-blur-md md:p-6"
              >
                <div className="absolute top-4 right-6 select-none font-extrabold text-3xl text-muted-foreground/30">
                  {(idx + 1).toString().padStart(2, '0')}
                </div>

                <div className="w-full max-w-[90%]">
                  <span className="mb-1 block font-semibold text-primary/80 text-xs uppercase tracking-wider">
                    {t('slideOutlineLabel', { number: idx + 1 })}
                  </span>

                  <div className="mt-2 space-y-4">
                    {/* Slide Layout Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                        Layout Type
                      </span>
                      <LayoutCategorySelect
                        value={slide.layoutType}
                        onValueChange={(val) =>
                          changeSlideLayout(
                            idx,
                            val as PlannedSlide['layoutType']
                          )
                        }
                        categories={
                          activeCategories.length > 0
                            ? activeCategories
                            : ALL_LAYOUT_CATEGORIES
                        }
                        previewMap={previewMap}
                        t={t}
                      />
                    </div>

                    {/* Slide Title Input */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                        Slide Title
                      </span>
                      <Input
                        value={slide.slideTitle}
                        onChange={(e) => updateSlideTitle(idx, e.target.value)}
                        placeholder="Slide Title"
                        className="h-10 rounded-xl border-input bg-muted/30 px-4 py-2 font-bold text-base text-foreground"
                      />
                    </div>

                    {/* Dynamic Layout bindings editor */}
                    {renderBindingsEditor(slide, idx)}
                  </div>

                  <div className="mt-4 flex justify-end border-border border-t pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSlide(idx)}
                      className="h-8 rounded-lg px-2.5"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete Slide
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addSlide}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-border border-dashed bg-muted/30 font-semibold text-muted-foreground text-sm transition-all hover:bg-accent/20 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Slide
            </Button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-md" />
            <Spinner className="h-12 w-12 animate-spin text-primary" />
          </div>
          <h3 className="mb-2 font-bold text-foreground text-xl">
            {generatorType === 'gamma'
              ? 'Generating Gamma Presentation'
              : t('generatingText')}
          </h3>

          <div className="mt-6 w-full space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-left">
            {generatorType === 'gamma' ? (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                      loaderStep >= 1
                        ? 'border border-primary/20 bg-primary/10 text-primary'
                        : 'border border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {loaderStep >= 1 ? '✓' : '1'}
                  </span>
                  <span
                    className={
                      loaderStep >= 1
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Connecting to Gamma API...
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                      loaderStep >= 2
                        ? 'border border-primary/20 bg-primary/10 text-primary'
                        : 'border border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {loaderStep >= 2 ? '✓' : '2'}
                  </span>
                  <span
                    className={
                      loaderStep >= 2
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Designing cards and layouts...
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                      loaderStep >= 1
                        ? 'border border-primary/20 bg-primary/10 text-primary'
                        : 'border border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {loaderStep >= 1 ? '✓' : '1'}
                  </span>
                  <span
                    className={
                      loaderStep >= 1
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Designing slide layouts...
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                      loaderStep >= 2
                        ? 'border border-primary/20 bg-primary/10 text-primary'
                        : 'border border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {loaderStep >= 2 ? '✓' : '2'}
                  </span>
                  <span
                    className={
                      loaderStep >= 2
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Injecting slide contents...
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'generated' &&
        (deckUrl ? (
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-2 py-4">
            <div className="flex w-full flex-1 gap-2 overflow-hidden">
              <iframe
                ref={iframeRef}
                src={
                  iframeVersion > 0 ? `${deckUrl}?v=${iframeVersion}` : deckUrl
                }
                title={title}
                allow="fullscreen"
                onLoad={enableVisualEditing}
                className={cn(
                  'w-full rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300',
                  isFullscreen ? 'h-[82vh]' : 'h-[58vh]'
                )}
              />
              {showItemEditor && !isGamma && (
                <div
                  className={cn(
                    'w-80 shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
                    isFullscreen ? 'h-[82vh]' : 'h-[58vh]'
                  )}
                >
                  <SlideItemEditor
                    slides={plannedSlides}
                    collection={
                      selectedCollection === 'auto'
                        ? (recommendedCollection ?? 'starter')
                        : selectedCollection
                    }
                    onBindingsChanged={(index, bindings) =>
                      setPlannedSlides((prev) =>
                        prev.map((s, i) =>
                          i === index
                            ? {
                                ...s,
                                bindings: normalizeSlideBindings(
                                  s.layoutType,
                                  s.slideTitle,
                                  bindings
                                ),
                              }
                            : s
                        )
                      )
                    }
                    onSlideRendered={applySvgToPreviewSlide}
                    onSelectedSlideChange={handleEditorSlideChange}
                  />
                </div>
              )}
            </div>
            {deckUsage && (
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 font-medium text-[11px] text-muted-foreground">
                {typeof deckUsage.total_tokens === 'number' && (
                  <span>
                    {t('usageTokens', {
                      tokens: deckUsage.total_tokens.toLocaleString(),
                    })}
                  </span>
                )}
                {typeof deckUsage.estimated_cost_usd === 'number' && (
                  <span>
                    {t('usageCost', {
                      cost: deckUsage.estimated_cost_usd.toFixed(4),
                    })}
                  </span>
                )}
                {typeof deckUsage.requests === 'number' && (
                  <span>
                    {t('usageRequests', { requests: deckUsage.requests })}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center overflow-hidden px-4 py-8">
            <div
              className={cn(
                'lesson-presentation-content w-full overflow-y-auto rounded-2xl border border-border bg-card p-8 shadow-2xl backdrop-blur-md transition-all duration-300 md:p-12',
                isFullscreen ? 'h-[65vh] max-h-[65vh]' : 'h-[45vh] max-h-[45vh]'
              )}
            >
              {plannedSlides[currentSlideIndex] ? (
                renderSlideContent(plannedSlides[currentSlideIndex])
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground italic">
                  {t('empty')}
                </div>
              )}
            </div>
          </div>
        ))}

      {/* Footer / Navigation (fallback preview only) */}
      {step === 'generated' && !deckUrl && (
        <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-border border-t pt-4 md:flex-row">
          <p className="order-3 font-medium text-muted-foreground text-xs md:order-1">
            {t('keyboardTip')}
          </p>

          <div className="order-1 flex items-center gap-4 md:order-2">
            <Button
              variant="outline"
              size="sm"
              className="disabled:opacity-50"
              onClick={() =>
                setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))
              }
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              {t('previous')}
            </Button>

            <span className="min-w-28 text-center font-semibold text-muted-foreground text-sm">
              {t('slideProgress', {
                current: currentSlideIndex + 1,
                total: plannedSlides.length,
              })}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="disabled:opacity-50"
              onClick={() =>
                setCurrentSlideIndex((prev) =>
                  Math.min(prev + 1, plannedSlides.length - 1)
                )
              }
              disabled={currentSlideIndex === plannedSlides.length - 1}
            >
              {t('next')}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          <div className="order-2 w-9 md:order-3" />
        </div>
      )}
      <SlideAiEditDialog
        isOpen={isAiEditOpen}
        scope={aiEditScope}
        previewText={selectedAiText ?? undefined}
        isPending={isAiEditing}
        onOpenChange={handleAiEditOpenChange}
        onSubmit={submitAiEdit}
      />
      <TemplateManagerDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
        collections={collections}
        isLoading={isLoadingTemplates}
      />
    </div>
  );
}
