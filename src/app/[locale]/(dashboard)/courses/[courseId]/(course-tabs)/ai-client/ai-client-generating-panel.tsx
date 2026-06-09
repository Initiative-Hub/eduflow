import {
  BookOpen,
  Check,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { SearchSourcesState } from '@/lib/course-generation/stream-state';
import { cn } from '@/lib/utils';
import type {
  GenerationStep,
  StreamingCourse,
} from '../../use-generate-course';
import { SearchSourcesPreview } from './search-sources-preview';

type AiClientGeneratingPanelProps = {
  generationStep: GenerationStep;
  generationError: string | null;
  streamingCourse: StreamingCourse | null | undefined;
  searchSources?: SearchSourcesState;
  lastSelection: {
    fileId?: string;
    file?: File;
    context?: string;
  } | null;
  onDismiss: () => void;
  onRetry?: (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => void;
};

type PipelineStep = 'extract' | 'search' | 'generate' | 'save';

const STEP_ORDER: PipelineStep[] = ['extract', 'search', 'generate', 'save'];

export function AiClientGeneratingPanel({
  generationStep,
  generationError,
  streamingCourse,
  searchSources,
  lastSelection,
  onDismiss,
  onRetry,
}: AiClientGeneratingPanelProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');
  const genT = useTranslations('Courses.CourseModules.AiGeneration');

  const activeStep: PipelineStep | null =
    generationStep === 'extract'
      ? 'extract'
      : generationStep === 'search'
        ? 'search'
        : generationStep === 'generate'
          ? 'generate'
          : generationStep === 'save'
            ? 'save'
            : null;

  const pipelineSteps: { key: PipelineStep; icon: ReactNode }[] = [
    { key: 'extract', icon: <FileText className="h-5 w-5" /> },
    { key: 'search', icon: <Globe className="h-5 w-5" /> },
    { key: 'generate', icon: <Sparkles className="h-5 w-5" /> },
    { key: 'save', icon: <BookOpen className="h-5 w-5" /> },
  ];

  const getStepStatus = (
    step: PipelineStep
  ): 'done' | 'active' | 'error' | 'pending' => {
    if (!activeStep) return 'pending';
    const activeIdx = STEP_ORDER.indexOf(activeStep);
    const stepIdx = STEP_ORDER.indexOf(step);
    if (generationStep === 'error') {
      if (stepIdx < activeIdx) return 'done';
      if (stepIdx === activeIdx) return 'error';
      return 'pending';
    }
    if (stepIdx < activeIdx) return 'done';
    if (stepIdx === activeIdx) return 'active';
    return 'pending';
  };

  const statusLabel =
    generationStep === 'extract'
      ? genT('documentReceived')
      : generationStep === 'search'
        ? genT('webSearching')
        : generationStep === 'generate'
          ? genT('craftingCurriculum')
          : genT('savingModules');

  const searchSourcesState = searchSources ?? {
    web: [],
    youtube: [],
    completed: { web: false, youtube: false },
  };

  const sourcePreviewLabels = {
    title: genT('sourcePreview.title'),
    web: genT('sourcePreview.web'),
    youtube: genT('sourcePreview.youtube'),
    webDescription: genT('sourcePreview.webDescription'),
    youtubeDescription: genT('sourcePreview.youtubeDescription'),
    searching: genT('sourcePreview.searching'),
    empty: genT('sourcePreview.empty'),
    foundCount: (count: number) => genT('sourcePreview.foundCount', { count }),
  };

  return (
    <div className="mt-6 space-y-6 pb-2">
      <div className="flex items-start justify-between gap-2">
        {pipelineSteps.map((step, idx) => {
          const status = getStepStatus(step.key);
          return (
            <div
              key={step.key}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex w-full items-center">
                {idx > 0 && (
                  <div
                    className={cn(
                      'absolute right-1/2 h-0.5 w-full transition-colors duration-700',
                      getStepStatus(pipelineSteps[idx - 1].key) === 'done'
                        ? 'bg-primary'
                        : 'bg-muted'
                    )}
                  />
                )}
                <div
                  className={cn(
                    'relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500',
                    status === 'done' &&
                      'border-primary bg-primary text-primary-foreground',
                    status === 'active' &&
                      'border-primary bg-primary text-primary-foreground',
                    status === 'error' &&
                      'border-destructive bg-destructive text-destructive-foreground',
                    status === 'pending' &&
                      'border-muted bg-muted text-muted-foreground'
                  )}
                >
                  {status === 'done' ? (
                    <Check className="h-5 w-5" />
                  ) : status === 'active' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : status === 'error' ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
              </div>
              <span
                className={cn(
                  'text-center font-medium text-[11px] transition-colors duration-300',
                  status === 'active' && 'text-primary',
                  status === 'done' && 'text-primary/70',
                  status === 'error' && 'text-destructive',
                  status === 'pending' && 'text-muted-foreground'
                )}
              >
                {t(`pipeline.${step.key}`)}
              </span>
            </div>
          );
        })}
      </div>

      {generationStep === 'search' && (
        <SearchSourcesPreview
          sources={searchSourcesState}
          isSearching={generationStep === 'search'}
          labels={sourcePreviewLabels}
        />
      )}

      {streamingCourse?.modules && streamingCourse.modules.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-muted/20 p-3">
          {(
            streamingCourse.modules as Array<{
              title?: string;
              lessons?: Array<{ lessonTitle?: string }>;
            }>
          ).map((mod, mIdx) => (
            <div
              key={mIdx}
              className="rounded-lg border bg-background px-3 py-2 shadow-sm"
            >
              <p className="font-semibold text-sm">
                {mIdx + 1}. {mod?.title || genT('identifyingModule')}
              </p>
              {mod?.lessons && mod.lessons.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-4">
                  {(mod.lessons as Array<{ lessonTitle?: string }>).map(
                    (lesson, lIdx) => (
                      <li
                        key={lIdx}
                        className="flex items-center gap-1.5 text-muted-foreground text-xs"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        {lesson?.lessonTitle || genT('draftingLesson')}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {generationStep === 'error' ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive text-sm">
                {genT('error')}
              </p>
              {generationError && (
                <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                  {generationError}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onDismiss}>
              {genT('dismiss')}
            </Button>
            {onRetry && lastSelection && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => onRetry(lastSelection)}
              >
                <RefreshCw className="h-4 w-4" />
                {genT('retry')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{statusLabel}</span>
        </div>
      )}
    </div>
  );
}
