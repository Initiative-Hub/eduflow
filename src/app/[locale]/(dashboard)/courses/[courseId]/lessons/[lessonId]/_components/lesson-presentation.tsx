'use client';

import { useEffect, useRef, useState } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import { useSlideHtml, useUpdateSlideHtml } from '../use-lesson';
import { toast } from 'sonner';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Edit,
  FileCode,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { cn } from '@/lib/utils';
import type { TiptapDocument } from '@/utils/lesson-content';
import { type PlannedSlide, usePresentation } from '../use-presentation';

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
    editOutline,
    updateSlideTitle,
    changeSlideLayout,
    deleteSlide,
    addSlide,
  } = usePresentation({ title, content, isOpen, onClose });

  const [isHtmlEditorOpen, setIsHtmlEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [iframeVersion, setIframeVersion] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const deckId = deckUrl ? deckUrl.split('/').pop() : undefined;

  const { data: fetchedHtml, isLoading: isFetchingHtml } = useSlideHtml(
    deckId || '',
    isHtmlEditorOpen
  );

  useEffect(() => {
    if (fetchedHtml) {
      setHtmlContent(fetchedHtml);
    }
  }, [fetchedHtml]);

  const updateSlideHtml = useUpdateSlideHtml();

  const handleSaveHtml = () => {
    if (!deckId) return;
    updateSlideHtml.mutate(
      { deckId, html: htmlContent },
      {
        onSuccess: () => {
          setIframeVersion((v) => v + 1);
          setIsHtmlEditorOpen(false);
          toast.success(t('visualSaveSuccess'));
        },
      }
    );
  };

  // Turn text-bearing nodes inside the generated iframe into editable elements.
  // Injects custom hover & focus dashed/solid styling outline blocks.
  const enableVisualEditing = () => {
    console.log('[VisualEditor] enableVisualEditing triggered');
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
        `;
        doc.head.appendChild(style);
        console.log('[VisualEditor] Injected hover styles into iframe head');
      }

      const elements = doc.querySelectorAll('text, tspan');
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

          const textEl = el as SVGTextElement;
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
  };

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
    };
  }, [deckUrl, iframeVersion]);

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

    // Clean up our click listener attributes
    clone.querySelectorAll('[data-has-click-listener]').forEach((el) => {
      el.removeAttribute('data-has-click-listener');
    });

    // Remove the injected editor style tag
    clone.querySelectorAll('style[data-slide-editor]').forEach((el) => {
      el.remove();
    });

    // Strip stray editors
    clone.querySelectorAll('textarea[data-active-editor]').forEach((el) => {
      el.remove();
    });

    const html = '<!DOCTYPE html>\n' + clone.outerHTML;

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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_60%)]" />
            <h1 className="mb-6 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-650 bg-clip-text font-extrabold text-3xl text-transparent tracking-tight drop-shadow-md md:text-4xl lg:text-5xl dark:from-blue-400 dark:via-indigo-200 dark:to-purple-400">
              {slideTitle}
            </h1>
            {bindings.subtitle && (
              <p className="mb-8 max-w-2xl font-medium text-base text-slate-650 leading-relaxed md:text-lg dark:text-slate-300">
                {bindings.subtitle}
              </p>
            )}
            {bindings.author && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 font-semibold text-primary text-xs uppercase tracking-wide dark:border-slate-800 dark:bg-slate-900/60">
                {bindings.author}
              </div>
            )}
          </div>
        );

      case 'AGENDA_OUTLINE':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.isArray(bindings.items) &&
                bindings.items.map((item: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950/45 dark:hover:border-slate-700"
                  >
                    <span className="font-extrabold text-lg text-primary/80">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm leading-snug dark:text-slate-200">
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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_60%)]" />
            <span className="mb-4 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-extrabold text-[10px] text-primary uppercase tracking-widest">
              Next Module
            </span>
            <h1 className="mb-4 font-extrabold text-2xl text-slate-900 tracking-wide md:text-4xl dark:text-slate-100">
              {slideTitle}
            </h1>
            {bindings.sub_module_name && (
              <div className="mt-2 font-semibold text-lg text-slate-500 italic dark:text-slate-400">
                {bindings.sub_module_name}
              </div>
            )}
          </div>
        );

      case 'TITLE_BULLETS':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <ul className="max-w-3xl space-y-4">
              {Array.isArray(bindings.bullets) &&
                bindings.bullets.map((bullet: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-950/30">
                <h3 className="mb-3 border-slate-200 border-b pb-2 font-bold text-slate-805 text-sm dark:border-slate-800 dark:text-slate-200">
                  {bindings.left_col_title || 'Column A'}
                </h3>
                <ul className="space-y-2.5">
                  {Array.isArray(bindings.left_col_text) &&
                    bindings.left_col_text.map(
                      (bullet: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-slate-700 text-xs dark:text-slate-300"
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-950/30">
                <h3 className="mb-3 border-slate-200 border-b pb-2 font-bold text-slate-805 text-sm dark:border-slate-800 dark:text-slate-200">
                  {bindings.right_col_title || 'Column B'}
                </h3>
                <ul className="space-y-2.5">
                  {Array.isArray(bindings.right_col_text) &&
                    bindings.right_col_text.map(
                      (bullet: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-slate-700 text-xs dark:text-slate-300"
                        >
                          <span className="mt-0.5 text-indigo-400">•</span>
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
            <blockquote className="-mt-3 mb-6 font-medium text-lg text-slate-800 italic leading-relaxed md:text-xl lg:text-2xl dark:text-slate-100">
              {bindings.quote}
            </blockquote>
            <span className="-mt-3 select-none font-serif text-4xl text-primary/30 leading-none">
              ”
            </span>
            {bindings.author_or_source && (
              <cite className="block border-slate-200 border-t px-6 pt-3 font-bold text-[10px] text-slate-500 uppercase not-italic tracking-widest dark:border-slate-800 dark:text-slate-400">
                {bindings.author_or_source}
              </cite>
            )}
          </div>
        );

      case 'KPI_BIG_NUMBER':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-8 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="flex flex-wrap justify-around gap-6">
              {Array.isArray(bindings.metrics) &&
                bindings.metrics.map((metric: any, index: number) => (
                  <div
                    key={index}
                    className="min-w-[150px] flex-1 rounded-2xl border border-slate-200 bg-slate-50/30 p-5 text-center shadow-inner dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="mb-2 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text font-extrabold text-3xl text-transparent md:text-5xl dark:from-emerald-400 dark:to-teal-200">
                      {metric.value}
                    </div>
                    <div className="font-bold text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-5">
              <div className="flex h-40 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-3 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="mb-3 block font-bold text-[10px] text-slate-650 uppercase tracking-wider dark:text-slate-500">
                  Data Projection ({bindings.chart_type || 'bar'} chart)
                </span>
                <div className="flex h-20 items-end justify-around gap-2">
                  {Array.isArray(bindings.chart_data) &&
                    bindings.chart_data.map((item: any, idx: number) => {
                      const maxVal = Math.max(
                        ...bindings.chart_data.map(
                          (d: any) => Number(d.value) || 1
                        ),
                        1
                      );
                      const heightPct = Math.min(
                        100,
                        Math.max(10, ((Number(item.value) || 0) / maxVal) * 100)
                      );
                      return (
                        <div
                          key={idx}
                          className="flex flex-1 flex-col items-center"
                        >
                          <div
                            className="w-full max-w-[20px] rounded-t bg-gradient-to-t from-primary/40 to-primary transition-all duration-500"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="mt-1.5 max-w-full truncate font-bold text-[9px] text-slate-650 dark:text-slate-500">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="rounded-xl border border-slate-200 border-dashed bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900/10">
                  <span className="mb-1.5 block font-extrabold text-[10px] text-primary uppercase tracking-widest">
                    Strategic Insight
                  </span>
                  <p className="font-medium text-slate-700 text-xs leading-relaxed md:text-sm dark:text-slate-300">
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-slate-700 text-xs dark:text-slate-300">
                <thead className="bg-slate-100 font-bold text-[10px] text-slate-800 uppercase tracking-wider dark:bg-slate-950 dark:text-slate-200">
                  <tr>
                    {Array.isArray(bindings.headers) &&
                      bindings.headers.map((h: string, idx: number) => (
                        <th
                          key={idx}
                          className="border-slate-200 border-b px-4 py-2.5 dark:border-slate-800"
                        >
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:bg-slate-900/10">
                  {Array.isArray(bindings.rows) &&
                    bindings.rows.map((row: string[], idx: number) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/20"
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              <div className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 border-dashed bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/60">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-100/50 to-transparent dark:from-slate-950/50" />
                <span className="z-10 mb-1 font-bold text-[10px] text-primary/80 uppercase tracking-widest">
                  Suggested Visual Asset
                </span>
                <p className="z-10 max-w-xs font-medium text-[10px] text-slate-650 leading-relaxed dark:text-slate-400">
                  "{bindings.image_prompt_description}"
                </p>
                <div className="z-10 mt-3 rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 font-semibold text-[9px] text-slate-600 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-500">
                  AI Image Generator Prompt
                </div>
              </div>
              <div className="font-medium text-slate-705 text-xs leading-relaxed md:text-sm dark:text-slate-300">
                {bindings.body_text}
              </div>
            </div>
          </div>
        );

      case 'TIMELINE_MILESTONES':
        return (
          <div className="w-full py-2 text-left">
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="relative ml-2 space-y-4 border-primary/20 border-l-2 pl-5">
              {Array.isArray(bindings.events) &&
                bindings.events.map((event: any, index: number) => (
                  <div key={index} className="relative">
                    <span className="absolute top-1.5 -left-[27px] flex h-3.5 w-3.5 items-center justify-center rounded-full border border-primary bg-white text-primary dark:bg-slate-950" />
                    <div>
                      <span className="mb-0.5 inline-block rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-extrabold text-[9px] text-primary uppercase">
                        {event.date_or_step}
                      </span>
                      <p className="font-semibold text-slate-800 text-xs leading-snug dark:text-slate-200">
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {Array.isArray(bindings.steps) &&
                bindings.steps.map((stepItem: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950/45 dark:hover:border-slate-700"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-extrabold text-primary text-xs">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-800 text-xs leading-snug dark:text-slate-200">
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="max-w-3xl space-y-3">
              {Array.isArray(bindings.summary_points) &&
                bindings.summary_points.map((point: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/20"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-400 text-xs">
                      ✓
                    </span>
                    <span className="font-semibold text-slate-705 text-sm leading-relaxed dark:text-slate-300">
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
              {slideTitle}
            </h2>
            <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 md:p-6">
              <span className="mb-2.5 block font-extrabold text-[10px] text-amber-500 uppercase tracking-widest dark:text-amber-400">
                Assignment / Next Steps
              </span>
              <ul className="space-y-3">
                {Array.isArray(bindings.action_items) &&
                  bindings.action_items.map((item: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 font-bold text-amber-500 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-amber-400">
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
            <h2 className="mb-6 border-slate-200 border-b pb-3 font-extrabold text-slate-900 text-xl md:text-2xl dark:border-slate-800 dark:text-slate-100">
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
                      className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 hover:border-emerald-500/30 hover:bg-slate-100 hover:shadow-emerald-500/5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/45 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-400 text-xs">
                          {index + 1}
                        </span>
                        <span className="line-clamp-1 font-bold text-slate-800 text-sm leading-snug transition-colors group-hover:text-emerald-550 dark:text-slate-200 dark:group-hover:text-emerald-400">
                          {source.title || 'Untitled Reference'}
                        </span>
                      </div>
                      {source.summary && (
                        <p className="line-clamp-2 pl-8 font-normal text-slate-650 text-xs leading-relaxed dark:text-slate-400">
                          {source.summary}
                        </p>
                      )}
                      <span className="truncate pl-8 font-mono text-[10px] text-slate-450 transition-colors group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-400">
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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_60%)]" />
            <h1 className="mb-6 bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 bg-clip-text font-extrabold text-3xl text-transparent tracking-tight md:text-4xl dark:from-emerald-400 dark:via-teal-200 dark:to-blue-400">
              Questions & Answers
            </h1>
            {bindings.footer_note && (
              <p className="mb-4 max-w-xl font-medium text-slate-700 text-sm italic leading-relaxed md:text-base dark:text-slate-300">
                "{bindings.footer_note}"
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold text-[9px] text-slate-600 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Thank you for participating!
            </div>
          </div>
        );

      default:
        return (
          <div className="py-2 text-left">
            <h2 className="mb-4 font-extrabold text-lg text-slate-100">
              {slideTitle}
            </h2>
            <pre className="overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-400 text-xs">
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
                bindings: {
                  ...s.bindings,
                  [key]: value,
                },
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
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Subtitle
              </span>
              <Input
                value={bindings.subtitle || ''}
                onChange={(e) => updateBinding('subtitle', e.target.value)}
                placeholder="Slide Subtitle"
                className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Author / Info
              </span>
              <Input
                value={bindings.author || ''}
                onChange={(e) => updateBinding('author', e.target.value)}
                placeholder="Author / Date info"
                className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        );

      case 'SECTION_HEADER':
        return (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              Sub-module Name
            </span>
            <Input
              value={bindings.sub_module_name || ''}
              onChange={(e) => updateBinding('sub_module_name', e.target.value)}
              placeholder="Sub-module or Section name"
              className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        );

      case 'BIG_QUOTE_TAKEAWAY':
        return (
          <div className="mt-2 space-y-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Quote Text
              </span>
              <Textarea
                value={bindings.quote || ''}
                onChange={(e) => updateBinding('quote', e.target.value)}
                placeholder="Important quote..."
                className="h-20 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Author or Source
              </span>
              <Input
                value={bindings.author_or_source || ''}
                onChange={(e) =>
                  updateBinding('author_or_source', e.target.value)
                }
                placeholder="Leonardo da Vinci, etc."
                className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        );

      case 'MEDIA_TEXT':
        return (
          <div className="mt-2 space-y-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Suggested Visual Prompt Description
              </span>
              <Textarea
                value={bindings.image_prompt_description || ''}
                onChange={(e) =>
                  updateBinding('image_prompt_description', e.target.value)
                }
                placeholder="E.g., A clean workflow flow diagram representing data architecture..."
                className="h-20 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Body Text
              </span>
              <Textarea
                value={bindings.body_text || ''}
                onChange={(e) => updateBinding('body_text', e.target.value)}
                placeholder="Body detail explanation..."
                className="h-20 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        );

      case 'REFERENCES_LIST': {
        const sources = Array.isArray(bindings.sources) ? bindings.sources : [];
        return (
          <div className="mt-2 flex flex-col gap-3">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
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
                    className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5"
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
                        className="h-8 rounded-lg border-slate-800 bg-slate-900/60 px-2.5 text-slate-100 text-xs focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <Input
                        value={src.url || ''}
                        onChange={(e) => {
                          const updated = [...sources];
                          updated[index] = { ...src, url: e.target.value };
                          updateBinding('sources', updated);
                        }}
                        placeholder={t('urlPlaceholder')}
                        className="h-8 rounded-lg border-slate-800 bg-slate-900/60 px-2.5 font-mono text-slate-100 text-xs focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <Input
                        value={src.summary || ''}
                        onChange={(e) => {
                          const updated = [...sources];
                          updated[index] = { ...src, summary: e.target.value };
                          updateBinding('sources', updated);
                        }}
                        placeholder={t('summaryPlaceholder')}
                        className="h-8 rounded-lg border-slate-800 bg-slate-900/60 px-2.5 text-slate-100 text-xs focus:border-primary focus:ring-1 focus:ring-primary"
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
                      className="h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
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
              className="mt-1 gap-1.5 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-slate-200"
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
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              Footer Closing Note
            </span>
            <Textarea
              value={bindings.footer_note || ''}
              onChange={(e) => updateBinding('footer_note', e.target.value)}
              placeholder="E.g., Thank you! Feel free to raise questions."
              className="h-16 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
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
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              List Items (One per line)
            </span>
            <Textarea
              value={arr.join('\n')}
              onChange={(e) =>
                updateBinding(listKey, e.target.value.split('\n'))
              }
              placeholder="Item 1&#10;Item 2&#10;Item 3"
              className="h-28 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
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
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  Left Column Title
                </span>
                <Input
                  value={bindings.left_col_title || ''}
                  onChange={(e) =>
                    updateBinding('left_col_title', e.target.value)
                  }
                  placeholder="Column title..."
                  className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  Left Column Items (One per line)
                </span>
                <Textarea
                  value={leftArr.join('\n')}
                  onChange={(e) =>
                    updateBinding('left_col_text', e.target.value.split('\n'))
                  }
                  placeholder="Detail 1&#10;Detail 2"
                  className="h-24 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  Right Column Title
                </span>
                <Input
                  value={bindings.right_col_title || ''}
                  onChange={(e) =>
                    updateBinding('right_col_title', e.target.value)
                  }
                  placeholder="Column title..."
                  className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  Right Column Items (One per line)
                </span>
                <Textarea
                  value={rightArr.join('\n')}
                  onChange={(e) =>
                    updateBinding('right_col_text', e.target.value.split('\n'))
                  }
                  placeholder="Detail 1&#10;Detail 2"
                  className="h-24 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
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
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/20 p-3">
              <span className="block font-bold text-[10px] text-slate-400">
                Metric 1
              </span>
              <Input
                value={metrics[0]?.value || ''}
                onChange={(e) => updateMetric(0, 'value', e.target.value)}
                placeholder="E.g., 98% or 10M+"
                className="h-9 rounded-xl border-slate-800 bg-slate-950 px-3 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <Input
                value={metrics[0]?.label || ''}
                onChange={(e) => updateMetric(0, 'label', e.target.value)}
                placeholder="Label (E.g., Accuracy)"
                className="h-9 rounded-xl border-slate-800 bg-slate-950 px-3 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/20 p-3">
              <span className="block font-bold text-[10px] text-slate-400">
                Metric 2
              </span>
              <Input
                value={metrics[1]?.value || ''}
                onChange={(e) => updateMetric(1, 'value', e.target.value)}
                placeholder="E.g., 45ms or $1.2B"
                className="h-9 rounded-xl border-slate-800 bg-slate-950 px-3 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <Input
                value={metrics[1]?.label || ''}
                onChange={(e) => updateMetric(1, 'label', e.target.value)}
                placeholder="Label (E.g., Query latency)"
                className="h-9 rounded-xl border-slate-800 bg-slate-950 px-3 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
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
          .map((d: any) => `${d.label}:${d.value}`)
          .join('\n');
        const updateChartData = (val: string) => {
          const parsedData = val
            .split('\n')
            .map((line) => {
              const [label, numStr] = line.split(':');
              if (!label) return null;
              return {
                label: label.trim(),
                value: Number(numStr?.trim() || 0),
              };
            })
            .filter(Boolean);
          updateBinding('chart_data', parsedData);
        };
        return (
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  Chart Type
                </span>
                <Select
                  value={bindings.chart_type || 'bar'}
                  onValueChange={(val) => updateBinding('chart_type', val)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-800 bg-slate-950 text-slate-300 text-xs focus:border-primary focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-950 text-slate-300">
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  Chart Data (Label:Value, one per line)
                </span>
                <Textarea
                  value={chartDataStr}
                  onChange={(e) => updateChartData(e.target.value)}
                  placeholder="Q1:20&#10;Q2:80&#10;Q3:45"
                  className="h-24 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                Insight Explanation
              </span>
              <Textarea
                value={bindings.insight_text || ''}
                onChange={(e) => updateBinding('insight_text', e.target.value)}
                placeholder="Visual analytics insights..."
                className="h-full min-h-[140px] resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
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
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
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
                className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
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
                className="h-20 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
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
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              Events List (Date/Step:Description, one per line)
            </span>
            <Textarea
              value={eventsStr}
              onChange={(e) => updateEvents(e.target.value)}
              placeholder="Phase 1:Setup project configuration&#10;Phase 2:Release production build"
              className="h-28 resize-none rounded-xl border-slate-800 bg-slate-950 px-4 py-2 text-slate-100 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        );
      }

      default:
        return (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              Raw Bindings Data (JSON)
            </span>
            <Textarea
              value={JSON.stringify(bindings, null, 2)}
              onChange={(e) => {
                try {
                  updateBinding('bindings', JSON.parse(e.target.value));
                } catch (_) {}
              }}
              className="h-28 rounded-xl border-slate-800 bg-slate-950 px-4 py-2 font-mono text-slate-100 text-xs focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative m-0 flex min-h-[75vh] w-full select-none flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 text-slate-900 shadow-xl md:p-10 dark:border-slate-800 dark:from-zinc-950 dark:via-slate-900 dark:to-zinc-950 dark:text-slate-100',
        isFullscreen &&
          'fixed inset-0 z-[9999] m-0 h-screen w-screen rounded-none border-none'
      )}
    >
      {/* Top progress bar */}
      {step === 'generated' && !deckUrl && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-slate-200/80 dark:bg-slate-800/80">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${((currentSlideIndex + 1) / plannedSlides.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-slate-200 border-b pb-4 dark:border-slate-800">
        <div>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary text-xs uppercase tracking-wider">
            {t('title')}
          </span>
          <h2 className="mt-2 max-w-md truncate font-bold text-lg text-slate-800 md:max-w-xl lg:max-w-2xl dark:text-slate-200">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {step === 'generated' && deckUrl && (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={handleSaveVisualEdits}
                disabled={updateSlideHtml.isPending}
              >
                <Save className="h-4 w-4" />
                {updateSlideHtml.isPending
                  ? t('savingHtml')
                  : t('btnSaveVisual')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => setIsHtmlEditorOpen(true)}
              >
                <FileCode className="h-4 w-4" />
                {t('btnEditHtml')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={editOutline}
              >
                <Edit className="h-4 w-4" />
                {t('btnEditOutline')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
              className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
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
            className="h-9 w-9 rounded-lg text-slate-500 hover:bg-red-55/20 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/20 dark:hover:text-red-400"
            onClick={onClose}
            title={t('close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Render Steps */}
      {step === 'input' && (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-2xl backdrop-blur-md md:p-8 dark:border-slate-800/80 dark:bg-slate-900/40">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800 text-xl dark:text-slate-100">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('title')}
            </h3>
            <p className="mb-6 text-slate-600 text-sm leading-relaxed dark:text-slate-400">
              {t('inputDesc')}
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  maxLength={500}
                  placeholder={t('inputPlaceholder')}
                  className="h-36 w-full resize-none rounded-xl border-slate-200 bg-slate-50 p-4 pb-8 font-sans text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <span className="absolute right-4 bottom-3 select-none font-medium text-slate-400 text-xs dark:text-slate-500">
                  {instructions.length} / 500
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider dark:text-slate-500">
                  {t('durationLabel')}
                </span>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="flex h-11 w-full justify-between rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                    <SelectValue placeholder={t('duration15')} />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                    <SelectItem value="5">{t('duration5')}</SelectItem>
                    <SelectItem value="10">{t('duration10')}</SelectItem>
                    <SelectItem value="15">{t('duration15')}</SelectItem>
                    <SelectItem value="30">{t('duration30')}</SelectItem>
                    <SelectItem value="45">{t('duration45')}</SelectItem>
                    <SelectItem value="60">{t('duration60')}</SelectItem>
                    <SelectItem value="90">{t('duration90')}</SelectItem>
                    <SelectItem value="120">{t('duration120')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="mb-2 block font-semibold text-slate-400 text-xs uppercase tracking-wider dark:text-slate-500">
                  {t('suggestLabel')}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest1'))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 text-xs transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    {t('suggest1')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest2'))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 text-xs transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    {t('suggest2')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest3'))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 text-xs transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    {t('suggest3')}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-slate-200 border-t pt-6 dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartPlanning}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t('btnPlan')}
                <ArrowRight className="h-4 w-4" />
              </Button>
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
          <h3 className="mb-2 font-bold text-slate-800 text-xl dark:text-slate-100">
            {t('planningText')}
          </h3>
          <p className="text-slate-500 text-sm dark:text-slate-400">
            Please wait while the slide structures and layout content bindings
            are compiled.
          </p>
        </div>
      )}

      {step === 'planned' && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-2 py-4">
          <div className="mb-6 flex shrink-0 flex-col items-start justify-between gap-4 border-slate-200 border-b pb-4 md:flex-row md:items-center dark:border-slate-800/80">
            <div>
              <h3 className="font-bold text-slate-900 text-xl dark:text-slate-100">
                {t('plannedTitle')}
              </h3>
              <p className="mt-1 text-slate-500 text-xs dark:text-slate-400">
                {t('plannedDesc')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('input')}
                className="h-9 rounded-lg border-slate-200 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
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
                className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-lg backdrop-blur-md md:p-6 dark:border-slate-800/80 dark:bg-slate-900/40"
              >
                <div className="absolute top-4 right-6 select-none font-extrabold text-3xl text-slate-200 dark:text-slate-800/60">
                  {(idx + 1).toString().padStart(2, '0')}
                </div>

                <div className="w-full max-w-[90%]">
                  <span className="mb-1 block font-semibold text-primary/80 text-xs uppercase tracking-wider">
                    {t('slideOutlineLabel', { number: idx + 1 })}
                  </span>

                  <div className="mt-2 space-y-4">
                    {/* Slide Layout Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                        Layout Type
                      </span>
                      <Select
                        value={slide.layoutType}
                        onValueChange={(val) =>
                          changeSlideLayout(
                            idx,
                            val as PlannedSlide['layoutType']
                          )
                        }
                      >
                        <SelectTrigger className="flex h-10 w-full justify-between rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-900 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                          <SelectValue placeholder="Select Layout" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                          <SelectItem value="TITLE_SLIDE">
                            Title Slide
                          </SelectItem>
                          <SelectItem value="AGENDA_OUTLINE">
                            Agenda & Outline
                          </SelectItem>
                          <SelectItem value="SECTION_HEADER">
                            Section Header
                          </SelectItem>
                          <SelectItem value="TITLE_BULLETS">
                            Title & Bullets
                          </SelectItem>
                          <SelectItem value="TWO_COLUMN_SPLIT">
                            Two Column Split
                          </SelectItem>
                          <SelectItem value="BIG_QUOTE_TAKEAWAY">
                            Big Quote Takeaway
                          </SelectItem>
                          <SelectItem value="KPI_BIG_NUMBER">
                            KPI & Big Numbers
                          </SelectItem>
                          <SelectItem value="CHART_INSIGHT">
                            Chart & Insight
                          </SelectItem>
                          <SelectItem value="DATA_TABLE">Data Table</SelectItem>
                          <SelectItem value="MEDIA_TEXT">
                            Media & Text
                          </SelectItem>
                          <SelectItem value="TIMELINE_MILESTONES">
                            Timeline & Milestones
                          </SelectItem>
                          <SelectItem value="STEP_BY_STEP">
                            Step By Step Process
                          </SelectItem>
                          <SelectItem value="CONCLUSION_SUMMARY">
                            Conclusion & Summary
                          </SelectItem>
                          <SelectItem value="CALL_TO_ACTION">
                            Call To Action / Homework
                          </SelectItem>
                          <SelectItem value="QA_CONTACT">
                            Q&A Closing Slide
                          </SelectItem>
                          <SelectItem value="REFERENCES_LIST">
                            {t('referencesLayout')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Slide Title Input */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                        Slide Title
                      </span>
                      <Input
                        value={slide.slideTitle}
                        onChange={(e) => updateSlideTitle(idx, e.target.value)}
                        placeholder="Slide Title"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 px-4 py-2 font-bold text-base text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>

                    {/* Dynamic Layout bindings editor */}
                    {renderBindingsEditor(slide, idx)}
                  </div>

                  <div className="mt-4 flex justify-end border-slate-200 border-t pt-2 dark:border-slate-900/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSlide(idx)}
                      className="h-8 rounded-lg px-2.5 text-red-650 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300"
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
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-slate-200 border-dashed bg-slate-50/50 font-semibold text-slate-500 text-sm transition-all hover:border-slate-350 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:border-dashed dark:bg-slate-900/10 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900/40 dark:hover:text-slate-200"
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
          <h3 className="mb-2 font-bold text-slate-900 text-xl dark:text-slate-100">
            {t('generatingText')}
          </h3>

          <div className="mt-6 w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-left dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                  loaderStep >= 1
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                )}
              >
                {loaderStep >= 1 ? '✓' : '1'}
              </span>
              <span
                className={
                  loaderStep >= 1
                    ? 'font-medium text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
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
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-550'
                )}
              >
                {loaderStep >= 2 ? '✓' : '2'}
              </span>
              <span
                className={
                  loaderStep >= 2
                    ? 'font-medium text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                }
              >
                Injecting slide contents...
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'generated' &&
        (deckUrl ? (
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-2 py-4">
            <iframe
              ref={iframeRef}
              src={
                iframeVersion > 0 ? `${deckUrl}?v=${iframeVersion}` : deckUrl
              }
              title={title}
              allow="fullscreen"
              onLoad={enableVisualEditing}
              className={cn(
                'w-full rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950',
                isFullscreen ? 'h-[82vh]' : 'h-[58vh]'
              )}
            />
            {deckUsage && (
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 font-medium text-[11px] text-slate-500">
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
                'lesson-presentation-content w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl backdrop-blur-md transition-all duration-300 md:p-12 dark:border-slate-800/80 dark:bg-slate-900/40',
                isFullscreen ? 'h-[65vh] max-h-[65vh]' : 'h-[45vh] max-h-[45vh]'
              )}
            >
              {plannedSlides[currentSlideIndex] ? (
                renderSlideContent(plannedSlides[currentSlideIndex])
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500 italic">
                  {t('empty')}
                </div>
              )}
            </div>
          </div>
        ))}

      {/* Footer / Navigation (fallback preview only) */}
      {step === 'generated' && !deckUrl && (
        <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-slate-200 border-t pt-4 md:flex-row dark:border-slate-800">
          <p className="order-3 font-medium text-slate-500 text-xs md:order-1">
            {t('keyboardTip')}
          </p>

          <div className="order-1 flex items-center gap-4 md:order-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() =>
                setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))
              }
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              {t('previous')}
            </Button>

            <span className="min-w-28 text-center font-semibold text-slate-600 text-sm dark:text-slate-400">
              {t('slideProgress', {
                current: currentSlideIndex + 1,
                total: plannedSlides.length,
              })}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
      <DialogTemplate
        isOpen={isHtmlEditorOpen}
        onOpenChange={setIsHtmlEditorOpen}
        title={t('editHtmlTitle')}
        className="max-w-4xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="ghost"
              onClick={() => setIsHtmlEditorOpen(false)}
              disabled={updateSlideHtml.isPending}
              className="rounded-xl px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveHtml}
              disabled={updateSlideHtml.isPending || isFetchingHtml}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-xl font-semibold min-w-28 flex items-center justify-center"
            >
              {updateSlideHtml.isPending ? t('savingHtml') : t('btnSaveHtml')}
            </Button>
          </div>
        }
      >
        {isFetchingHtml ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="h-10 w-10 text-primary animate-spin" />
            <span className="text-sm text-slate-500">{t('fetchingHtml')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="font-mono text-[11px] bg-zinc-950 text-emerald-450 p-4 border border-zinc-850 rounded-xl h-[60vh] w-full focus:outline-none focus:ring-1 focus:ring-primary overflow-y-auto resize-none"
              spellCheck={false}
            />
          </div>
        )}
      </DialogTemplate>
    </div>
  );
}
