import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TiptapDocument } from '@/utils/lesson-content';
import { usePlanPresentation } from './use-lesson';

type Step = 'input' | 'planning' | 'planned' | 'generating' | 'generated';

export interface PlannedSlide {
  id: string;
  layoutType:
    | 'TITLE_SLIDE'
    | 'AGENDA_OUTLINE'
    | 'SECTION_HEADER'
    | 'TITLE_BULLETS'
    | 'TWO_COLUMN_SPLIT'
    | 'BIG_QUOTE_TAKEAWAY'
    | 'KPI_BIG_NUMBER'
    | 'CHART_INSIGHT'
    | 'DATA_TABLE'
    | 'MEDIA_TEXT'
    | 'TIMELINE_MILESTONES'
    | 'STEP_BY_STEP'
    | 'CONCLUSION_SUMMARY'
    | 'CALL_TO_ACTION'
    | 'QA_CONTACT'
    | 'REFERENCES_LIST';
  slideTitle: string;
  bindings: Record<string, any>;
}

export function usePresentation(options: {
  title: string;
  content: TiptapDocument;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { title, content, isOpen, onClose } = options;
  const params = useParams();
  const lessonId = params?.lessonId as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { planPresentation } = usePlanPresentation();

  // State Machine
  const [step, setStep] = useState<Step>('input');
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('15');
  const [plannedSlides, setPlannedSlides] = useState<PlannedSlide[]>([]);
  const [loaderStep, setLoaderStep] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Dynamic Outlines fallback generator
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

      // 1. Title Slide
      list.push({
        id: 'slide-title',
        layoutType: 'TITLE_SLIDE',
        slideTitle: title,
        bindings: {
          subtitle: userPrompt
            ? `Guidelines: "${userPrompt}"`
            : 'Overview of the lesson concepts',
          author: `Duration: ${slideDuration} minutes`,
        },
      });

      // 2. Agenda Slide
      list.push({
        id: 'slide-agenda',
        layoutType: 'AGENDA_OUTLINE',
        slideTitle: 'Agenda & Overview',
        bindings: {
          items:
            headings.length > 0
              ? headings.slice(0, 4)
              : ['Core Objectives', 'Key Concepts', 'Practical Summary'],
        },
      });

      const availableSlots = Math.max(1, maxSlides - 3);

      if (headings.length > 0) {
        headings.slice(0, availableSlots).forEach((heading, idx) => {
          const layouts: Array<PlannedSlide['layoutType']> = [
            'TITLE_BULLETS',
            'TWO_COLUMN_SPLIT',
            'BIG_QUOTE_TAKEAWAY',
            'STEP_BY_STEP',
          ];
          const layoutType = layouts[idx % layouts.length];

          let bindings: Record<string, any> = {};
          if (layoutType === 'TITLE_BULLETS') {
            bindings = {
              bullets: [
                `Introduction to ${heading}`,
                `Key challenges in ${heading}`,
                'Strategic advantages',
              ],
            };
          } else if (layoutType === 'TWO_COLUMN_SPLIT') {
            bindings = {
              left_col_title: 'Core Objectives',
              left_col_text: [
                `Understand ${heading} basics`,
                'Apply theory to examples',
              ],
              right_col_title: 'Key Outcomes',
              right_col_text: [
                'Successful implementation',
                'Advanced scaling capacity',
              ],
            };
          } else if (layoutType === 'BIG_QUOTE_TAKEAWAY') {
            bindings = {
              quote: `The essence of ${heading} lies in mastering the fundamentals and applying them with consistency.`,
              author_or_source: 'Lesson Key Takeaway',
            };
          } else {
            bindings = {
              steps: [
                `Analyze ${heading}`,
                `Implement core solutions`,
                'Review and optimize performance',
              ],
            };
          }

          list.push({
            id: `slide-heading-${idx}`,
            layoutType,
            slideTitle: heading,
            bindings,
          });
        });

        while (list.length < maxSlides - 1) {
          const idx = list.length;
          list.push({
            id: `slide-extra-${idx}`,
            layoutType: 'TITLE_BULLETS',
            slideTitle: `Concept Expansion ${idx}`,
            bindings: {
              bullets: [
                'Detailed discussion of theoretical implications',
                'Practical edge cases to consider',
              ],
            },
          });
        }
      } else {
        const fallbacks: Array<{
          layoutType: PlannedSlide['layoutType'];
          slideTitle: string;
          bindings: any;
        }> = [
          {
            layoutType: 'TITLE_BULLETS',
            slideTitle: 'Core Objectives',
            bindings: {
              bullets: [
                'Understand key theoretical concepts',
                'Analyze practical implementation strategies',
                'Review real-world examples and data',
              ],
            },
          },
          {
            layoutType: 'STEP_BY_STEP',
            slideTitle: 'Key Mechanics',
            bindings: {
              steps: [
                'Step 1: Detailed step-by-step breakdown',
                'Step 2: Interactive coding/design exercises',
                'Step 3: Common mistakes and how to solve them',
              ],
            },
          },
          {
            layoutType: 'TWO_COLUMN_SPLIT',
            slideTitle: 'Advanced Applications',
            bindings: {
              left_col_title: 'Use Cases',
              left_col_text: [
                'Scaling legacy platforms',
                'Designing cloud architecture',
              ],
              right_col_title: 'Best Practices',
              right_col_text: [
                'Maintain strict type safety',
                'Enable high-end visual states',
              ],
            },
          },
        ];

        const count = Math.min(availableSlots, fallbacks.length);
        for (let i = 0; i < count; i++) {
          list.push({
            id: `slide-fallback-${i}`,
            layoutType: fallbacks[i].layoutType,
            slideTitle: fallbacks[i].slideTitle,
            bindings: fallbacks[i].bindings,
          });
        }
      }

      list.push({
        id: 'slide-qa',
        layoutType: 'QA_CONTACT',
        slideTitle: 'Q&A & Contact Info',
        bindings: {
          footer_note:
            'Thank you for attending! Let us move to the discussion session.',
        },
      });

      return list;
    },
    [content, title]
  );

  // Planning trigger with streaming API integration
  const handleStartPlanning = async () => {
    setStep('planning');
    setLoaderStep(0);

    try {
      const response = await fetch('/api/v1/presentation/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          duration,
          context: instructions,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let lineBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        lineBuffer += value;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let event: any;
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }

          switch (event.type) {
            case 'compiling':
              setLoaderStep(1);
              break;
            case 'done': {
              const slidesWithIds = (event.slides || []).map(
                (s: any, idx: number) => ({
                  id: s.id || `slide-${idx}-${Date.now()}`,
                  layoutType: s.layoutType,
                  slideTitle: s.slideTitle,
                  bindings: s.bindings || {},
                })
              );
              setPlannedSlides(slidesWithIds);
              setStep('planned');
              break;
            }
            case 'error':
              throw new Error(event.message);
          }
        }
      }
    } catch (error) {
      console.error(
        'API Slide Planning stream failed, falling back to local simulation:',
        error
      );
      setTimeout(() => {
        const outlines = generateOutlines(instructions, duration);
        setPlannedSlides(outlines);
        setStep('planned');
      }, 2000);
    }
  };

  // Outline updates
  const updateSlideTitle = (index: number, newTitle: string) => {
    setPlannedSlides((prev) =>
      prev.map((slide, idx) =>
        idx === index ? { ...slide, slideTitle: newTitle } : slide
      )
    );
  };

  const changeSlideLayout = (
    index: number,
    newLayout: PlannedSlide['layoutType']
  ) => {
    let defaultBindings: Record<string, any> = {};
    if (newLayout === 'TITLE_SLIDE') {
      defaultBindings = {
        subtitle: 'Concept overview and context',
        author: 'Presenter Name',
      };
    } else if (newLayout === 'AGENDA_OUTLINE') {
      defaultBindings = {
        items: [
          'Learning objectives',
          'Core frameworks',
          'Interactive exercise',
        ],
      };
    } else if (newLayout === 'SECTION_HEADER') {
      defaultBindings = { sub_module_name: 'Concept deep dive' };
    } else if (newLayout === 'TITLE_BULLETS') {
      defaultBindings = {
        bullets: ['Key takeaway details', 'Critical insights & theory'],
      };
    } else if (newLayout === 'TWO_COLUMN_SPLIT') {
      defaultBindings = {
        left_col_title: 'Pros',
        left_col_text: ['High-speed runtime', 'Better modularity'],
        right_col_title: 'Cons',
        right_col_text: ['Initial overhead', 'Additional architecture layers'],
      };
    } else if (newLayout === 'BIG_QUOTE_TAKEAWAY') {
      defaultBindings = {
        quote: 'Simplicity is the ultimate sophistication.',
        author_or_source: 'Leonardo da Vinci',
      };
    } else if (newLayout === 'KPI_BIG_NUMBER') {
      defaultBindings = {
        metrics: [
          { value: '98%', label: 'Retention rate' },
          { value: '45ms', label: 'Response latency' },
        ],
      };
    } else if (newLayout === 'CHART_INSIGHT') {
      defaultBindings = {
        chart_type: 'bar',
        chart_data: [
          { label: 'Q1', value: 30 },
          { label: 'Q2', value: 85 },
          { label: 'Q3', value: 65 },
        ],
        insight_text: 'Q2 sales grew by 85% due to seasonal integration.',
      };
    } else if (newLayout === 'DATA_TABLE') {
      defaultBindings = {
        headers: ['Metric', 'Target', 'Actual'],
        rows: [
          ['Speed', '100ms', '45ms'],
          ['Cost', '$10', '$8.50'],
        ],
      };
    } else if (newLayout === 'MEDIA_TEXT') {
      defaultBindings = {
        image_prompt_description:
          'An illustrative flow diagram representing server pipelines',
        body_text:
          'This system routes request payloads directly to dynamic layout components.',
      };
    } else if (newLayout === 'TIMELINE_MILESTONES') {
      defaultBindings = {
        events: [
          { date_or_step: '2024', description: 'Initial Alpha release' },
          { date_or_step: '2026', description: 'Complete scale out' },
        ],
      };
    } else if (newLayout === 'STEP_BY_STEP') {
      defaultBindings = {
        steps: ['Initialize repository', 'Apply migrations', 'Run dev server'],
      };
    } else if (newLayout === 'CONCLUSION_SUMMARY') {
      defaultBindings = {
        summary_points: [
          'Refined layout routing saves computation resources',
          'Bilingual components maintain strict translation standards',
        ],
      };
    } else if (newLayout === 'CALL_TO_ACTION') {
      defaultBindings = {
        action_items: [
          'Complete the homework assessment',
          'Submit review query',
        ],
      };
    } else if (newLayout === 'QA_CONTACT') {
      defaultBindings = {
        footer_note: 'Ask questions or check the repository documentation.',
      };
    } else if (newLayout === 'REFERENCES_LIST') {
      defaultBindings = {
        sources: [{ title: 'Reference Source 1', url: 'https://example.com' }],
      };
    }

    setPlannedSlides((prev) =>
      prev.map((slide, idx) =>
        idx === index
          ? { ...slide, layoutType: newLayout, bindings: defaultBindings }
          : slide
      )
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
        layoutType: 'TITLE_BULLETS',
        slideTitle: 'New Slide Title',
        bindings: {
          bullets: [
            'First bullet point outline',
            'Second bullet point outline',
          ],
        },
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
        setCurrentSlideIndex((prev) =>
          Math.min(prev + 1, plannedSlides.length - 1)
        );
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
  }, [isOpen, step, onClose, plannedSlides.length]);

  return {
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
    isFullscreen,
    containerRef,
    toggleFullscreen,
    handleStartPlanning,
    handleStartGenerating,
    updateSlideTitle,
    changeSlideLayout,
    deleteSlide,
    addSlide,
  };
}
