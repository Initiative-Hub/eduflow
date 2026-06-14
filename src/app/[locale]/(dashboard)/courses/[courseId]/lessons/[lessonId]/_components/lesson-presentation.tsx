'use client';

import type { JSONContent } from '@tiptap/core';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Youtube } from '@tiptap/extension-youtube';
import { Selection } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
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

interface LessonPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: TiptapDocument;
}

type Step = 'input' | 'planning' | 'planned' | 'generating' | 'generated';

interface PlannedSlide {
  id: string;
  title: string;
  bullets: string[];
}

export function LessonPresentation({
  isOpen,
  onClose,
  title,
  content,
}: LessonPresentationProps) {
  const t = useTranslations('Courses.LessonPresentation');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State Machine
  const [step, setStep] = useState<Step>('input');
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('15');
  const [plannedSlides, setPlannedSlides] = useState<PlannedSlide[]>([]);
  const [loaderStep, setLoaderStep] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Dynamic Dynamic Outlines from Lesson Content
  const generateOutlines = useCallback(
    (userPrompt: string, slideDuration: string): PlannedSlide[] => {
      if (!content || !content.content) return [];

      let maxSlides = 5;
      if (slideDuration === '5') maxSlides = 3;
      else if (slideDuration === '10') maxSlides = 4;
      else if (slideDuration === '15') maxSlides = 5;
      else if (slideDuration === '30') maxSlides = 8;
      else if (slideDuration === '45') maxSlides = 10;
      else if (slideDuration === '60') maxSlides = 12;
      else if (slideDuration === '90') maxSlides = 16;
      else if (slideDuration === '120') maxSlides = 20;

      const headings = content.content
        .filter((node) => node.type === 'heading')
        .map((node) => node.content?.map((c) => c.text).join('') || '')
        .filter(Boolean);

      const list: PlannedSlide[] = [];

      // Title Slide
      list.push({
        id: 'slide-title',
        title: title,
        bullets: [
          'Presentation Title Slide',
          userPrompt
            ? `Guidelines: "${userPrompt}"`
            : 'Overview of the lesson concepts',
          `Planned Duration: ${slideDuration} minutes`,
        ],
      });

      const availableHeadingSlots = Math.max(1, maxSlides - 2);

      if (headings.length > 0) {
        const slicedHeadings = headings.slice(0, availableHeadingSlots);
        slicedHeadings.forEach((heading, idx) => {
          list.push({
            id: `slide-heading-${idx}`,
            title: heading,
            bullets: [
              `Key point: ${heading}`,
              'Detailed discussion and practical context',
              'Review questions / self-reflection',
            ],
          });
        });

        // Fill remaining slots
        while (list.length < maxSlides - 1) {
          const idx = list.length;
          list.push({
            id: `slide-extra-${idx}`,
            title: `Supplemental Concept ${idx - slicedHeadings.length}`,
            bullets: [
              'Additional insight regarding this topic',
              'Context and key takeaways',
              'Exercise or reflection point',
            ],
          });
        }
      } else {
        const fallbacks = [
          {
            title: 'Core Objectives',
            bullets: [
              'Understand key theoretical concepts',
              'Analyze practical implementation strategies',
              'Review real-world examples and data',
            ],
          },
          {
            title: 'Key Mechanics',
            bullets: [
              'Detailed step-by-step breakdown',
              'Interactive coding/design exercises',
              'Common mistakes and how to solve them',
            ],
          },
          {
            title: 'Advanced Applications',
            bullets: [
              'Complex use cases and scaling',
              'Performance optimizations and safety measures',
              'Integration guidelines and ecosystem tools',
            ],
          },
          {
            title: 'Evaluation Criteria',
            bullets: [
              'Self-assessment guidelines',
              'Evaluation metrics and benchmarks',
              'Rubrics and verification procedures',
            ],
          },
        ];

        const count = Math.min(availableHeadingSlots, fallbacks.length);
        for (let i = 0; i < count; i++) {
          list.push({
            id: `slide-fallback-${i}`,
            title: fallbacks[i].title,
            bullets: fallbacks[i].bullets,
          });
        }
      }

      // Conclusion Slide
      list.push({
        id: 'slide-conclusion',
        title: 'Summary & Wrap Up',
        bullets: [
          'Recap of primary learning objectives',
          `Wrap-up for a ${slideDuration}-minute presentation`,
          'Q&A / Discussion guidelines',
        ],
      });

      return list;
    },
    [content, title]
  );

  // Planning trigger
  const handleStartPlanning = () => {
    setStep('planning');
    setLoaderStep(0);

    // Simulate steps of the planning route
    const t1 = setTimeout(() => setLoaderStep(1), 500);
    const t2 = setTimeout(() => setLoaderStep(2), 1000);
    const t3 = setTimeout(() => setLoaderStep(3), 1500);

    const t4 = setTimeout(() => {
      const outlines = generateOutlines(instructions, duration);
      setPlannedSlides(outlines);
      setStep('planned');
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  };

  // Outline updates
  const updateSlideTitle = (index: number, newTitle: string) => {
    setPlannedSlides((prev) =>
      prev.map((slide, idx) =>
        idx === index ? { ...slide, title: newTitle } : slide
      )
    );
  };

  const updateSlideBullets = (index: number, rawText: string) => {
    setPlannedSlides((prev) =>
      prev.map((slide, idx) => {
        if (idx === index) {
          return {
            ...slide,
            bullets: rawText.split('\n'),
          };
        }
        return slide;
      })
    );
  };

  const deleteSlide = (index: number) => {
    setPlannedSlides((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addSlide = () => {
    setPlannedSlides((prev) => [
      ...prev,
      {
        id: `slide-custom-${Date.now()}`,
        title: 'New Slide Title',
        bullets: ['First bullet point outline', 'Second bullet point outline'],
      },
    ]);
  };

  // Generation trigger
  const handleStartGenerating = () => {
    setStep('generating');
    setLoaderStep(0);

    const t1 = setTimeout(() => setLoaderStep(1), 600);
    const t2 = setTimeout(() => setLoaderStep(2), 1200);

    const t3 = setTimeout(() => {
      setStep('generated');
      setCurrentSlideIndex(0);
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  // Map planned slides content structure directly into Tiptap slides JSON format
  const slides = useMemo(() => {
    if (step === 'generated' || step === 'generating') {
      return plannedSlides.map((slide) => {
        const contentNodes: JSONContent[] = [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: slide.title }],
          },
        ];
        if (slide.bullets && slide.bullets.length > 0) {
          const listItems = slide.bullets
            .map((b) => b.trim())
            .filter(Boolean)
            .map((bullet) => ({
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: bullet }],
                },
              ],
            }));
          if (listItems.length > 0) {
            contentNodes.push({
              type: 'bulletList',
              content: listItems,
            });
          }
        }
        return contentNodes;
      });
    }

    return [[]];
  }, [step, plannedSlides]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        class:
          'lesson-tiptap-editor ProseMirror max-w-none text-slate-100 outline-none',
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: true,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Youtube.configure({
        addPasteHandler: true,
      }),
      Typography,
      Superscript,
      Subscript,
      Selection,
    ],
    content: {
      type: 'doc',
      content: slides[0] || [],
    },
  });

  // Sync editor content with active slide
  useEffect(() => {
    if (editor && slides[currentSlideIndex]) {
      editor.commands.setContent({
        type: 'doc',
        content: slides[currentSlideIndex],
      });
    }
  }, [editor, currentSlideIndex, slides]);

  // Fullscreen support
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen mode:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Failed to exit fullscreen mode:', err);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || step !== 'generated') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, step, onClose, slides.length]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative m-0 flex min-h-[75vh] w-full select-none flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-6 text-slate-100 shadow-xl md:p-10',
        isFullscreen &&
          'fixed inset-0 z-[9999] m-0 h-screen w-screen rounded-none border-none'
      )}
    >
      {/* Top progress bar */}
      {step === 'generated' && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-slate-800/80">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${((currentSlideIndex + 1) / slides.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-slate-800 border-b pb-4">
        <div>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary text-xs uppercase tracking-wider">
            {t('title')}
          </span>
          <h2 className="mt-2 max-w-md truncate font-bold text-lg text-slate-200 md:max-w-xl lg:max-w-2xl">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {step === 'generated' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
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
            className="h-9 w-9 rounded-lg text-slate-400 hover:bg-red-950/20 hover:text-red-400"
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
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md md:p-8">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-100 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('title')}
            </h3>
            <p className="mb-6 text-slate-400 text-sm leading-relaxed">
              {t('inputDesc')}
            </p>

            <div className="space-y-4">
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t('inputPlaceholder')}
                className="h-36 resize-none rounded-xl border-slate-800 bg-slate-950 p-4 font-sans text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary"
              />

              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
                  {t('durationLabel')}
                </span>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="flex h-11 w-full justify-between rounded-xl border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 text-sm">
                    <SelectValue placeholder={t('duration15')} />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
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
                <span className="mb-2 block font-semibold text-slate-500 text-xs uppercase tracking-wider">
                  {t('suggestLabel')}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest1'))}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300 text-xs transition-colors hover:border-slate-700 hover:bg-slate-900"
                  >
                    {t('suggest1')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest2'))}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300 text-xs transition-colors hover:border-slate-700 hover:bg-slate-900"
                  >
                    {t('suggest2')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstructions(t('suggest3'))}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-300 text-xs transition-colors hover:border-slate-700 hover:bg-slate-900"
                  >
                    {t('suggest3')}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-slate-800 border-t pt-6">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
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
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-md" />
            <Spinner className="h-12 w-12 text-primary" />
          </div>
          <h3 className="mb-2 font-bold text-slate-100 text-xl">
            {t('planningText')}
          </h3>

          <div className="mt-6 w-full space-y-3 rounded-xl border border-slate-900/80 bg-slate-950/50 p-4 text-left">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                  loaderStep >= 1
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border border-slate-800 bg-slate-905 text-slate-500'
                )}
              >
                {loaderStep >= 1 ? '✓' : '1'}
              </span>
              <span
                className={
                  loaderStep >= 1
                    ? 'font-medium text-slate-300'
                    : 'text-slate-500'
                }
              >
                Analyzing lesson structure...
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                  loaderStep >= 2
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border border-slate-800 bg-slate-905 text-slate-500'
                )}
              >
                {loaderStep >= 2 ? '✓' : '2'}
              </span>
              <span
                className={
                  loaderStep >= 2
                    ? 'font-medium text-slate-300'
                    : 'text-slate-500'
                }
              >
                Applying custom instructions...
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                  loaderStep >= 3
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border border-slate-800 bg-slate-905 text-slate-500'
                )}
              >
                {loaderStep >= 3 ? '✓' : '3'}
              </span>
              <span
                className={
                  loaderStep >= 3
                    ? 'font-medium text-slate-300'
                    : 'text-slate-500'
                }
              >
                Structuring slide outlines...
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'planned' && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-2 py-4">
          <div className="mb-6 flex shrink-0 flex-col items-start justify-between gap-4 border-slate-800/80 border-b pb-4 md:flex-row md:items-center">
            <div>
              <h3 className="font-bold text-slate-100 text-xl">
                {t('plannedTitle')}
              </h3>
              <p className="mt-1 text-slate-400 text-xs">{t('plannedDesc')}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('input')}
                className="h-9 rounded-lg border-slate-800 bg-slate-900/60 px-3 font-medium text-slate-300 hover:bg-slate-800"
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
                className="relative rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-md md:p-6"
              >
                <div className="absolute top-4 right-6 select-none font-extrabold text-3xl text-slate-800/60">
                  {(idx + 1).toString().padStart(2, '0')}
                </div>

                <div className="max-w-[85%]">
                  <span className="mb-1 block font-semibold text-primary/80 text-xs uppercase tracking-wider">
                    {t('slideOutlineLabel', { number: idx + 1 })}
                  </span>

                  <div className="mt-2 space-y-3">
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlideTitle(idx, e.target.value)}
                      placeholder="Slide Title"
                      className="h-10 rounded-xl border-slate-800 bg-slate-950 px-4 py-2 font-bold text-base text-slate-100 focus:border-primary focus:ring-1 focus:ring-primary"
                    />

                    <Textarea
                      value={slide.bullets.join('\n')}
                      onChange={(e) => updateSlideBullets(idx, e.target.value)}
                      className="h-28 resize-none rounded-xl border-slate-800 bg-slate-950/45 px-4 py-3 font-medium font-sans text-slate-300 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Bullet outlines, one per line..."
                    />
                  </div>

                  <div className="mt-2 flex justify-end border-slate-900/40 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSlide(idx)}
                      className="h-8 rounded-lg px-2.5 text-red-400 transition-colors hover:bg-red-950/20 hover:text-red-300"
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
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-slate-800 border-dashed bg-slate-900/10 font-semibold text-slate-400 text-sm transition-all hover:border-slate-700 hover:bg-slate-900/40 hover:text-slate-200"
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
          <h3 className="mb-2 font-bold text-slate-100 text-xl">
            {t('generatingText')}
          </h3>

          <div className="mt-6 w-full space-y-3 rounded-xl border border-slate-900/80 bg-slate-950/50 p-4 text-left">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full font-semibold text-xs',
                  loaderStep >= 1
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border border-slate-800 bg-slate-905 text-slate-500'
                )}
              >
                {loaderStep >= 1 ? '✓' : '1'}
              </span>
              <span
                className={
                  loaderStep >= 1
                    ? 'font-medium text-slate-300'
                    : 'text-slate-500'
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
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border border-slate-800 bg-slate-905 text-slate-500'
                )}
              >
                {loaderStep >= 2 ? '✓' : '2'}
              </span>
              <span
                className={
                  loaderStep >= 2
                    ? 'font-medium text-slate-300'
                    : 'text-slate-500'
                }
              >
                Injecting slide contents...
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 'generated' && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center overflow-hidden px-4 py-8">
          <div
            className={cn(
              'lesson-presentation-content w-full overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 md:p-12',
              isFullscreen ? 'h-[65vh] max-h-[65vh]' : 'h-[45vh] max-h-[45vh]'
            )}
          >
            {slides[currentSlideIndex]?.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 italic">
                {t('empty')}
              </div>
            ) : (
              editor && <EditorContent editor={editor} />
            )}
          </div>
        </div>
      )}

      {/* Footer / Navigation */}
      {step === 'generated' && (
        <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-slate-800 border-t pt-4 md:flex-row">
          <p className="order-3 font-medium text-slate-500 text-xs md:order-1">
            {t('keyboardTip')}
          </p>

          <div className="order-1 flex items-center gap-4 md:order-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900/60 font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
              onClick={() =>
                setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))
              }
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              {t('previous')}
            </Button>

            <span className="min-w-28 text-center font-semibold text-slate-400 text-sm">
              {t('slideProgress', {
                current: currentSlideIndex + 1,
                total: slides.length,
              })}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900/60 font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
              onClick={() =>
                setCurrentSlideIndex((prev) =>
                  Math.min(prev + 1, slides.length - 1)
                )
              }
              disabled={currentSlideIndex === slides.length - 1}
            >
              {t('next')}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          <div className="order-2 w-9 md:order-3" />
        </div>
      )}
    </div>
  );
}
