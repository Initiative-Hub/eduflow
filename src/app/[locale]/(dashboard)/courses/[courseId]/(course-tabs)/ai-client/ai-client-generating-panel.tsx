import { Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CourseContentSearchSourcesState } from '@/lib/course-content/stream-state';
import type {
  CourseContentDraft,
  GenerationPipelineStep,
  GenerationStep,
} from '../../use-generate-course-content';
import { CourseContentPreview } from './course-content-preview';
import {
  GenerationPipelineStepper,
  PIPELINE_STEP_ORDER,
  type PipelineStep,
  type PipelineStepStatus,
} from './generation-pipeline-stepper';
import { SearchSourcesPreview } from './search-sources-preview';

type AiClientGeneratingPanelProps = {
  generationStep: GenerationStep;
  lastStartedStep: GenerationPipelineStep | null;
  generationError: string | null;
  courseContentDraft: CourseContentDraft | null | undefined;
  searchSources?: CourseContentSearchSourcesState;
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

function getPipelineStep(step: GenerationStep): PipelineStep | null {
  return PIPELINE_STEP_ORDER.includes(step as PipelineStep)
    ? (step as PipelineStep)
    : null;
}

export function AiClientGeneratingPanel({
  generationStep,
  lastStartedStep,
  generationError,
  courseContentDraft,
  searchSources,
  lastSelection,
  onDismiss,
  onRetry,
}: AiClientGeneratingPanelProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');
  const genT = useTranslations('Courses.CourseModules.CourseContentGeneration');
  const liveStep = getPipelineStep(generationStep);
  const progressStep = liveStep ?? lastStartedStep;
  const previousProgressStep = useRef<PipelineStep | null>(progressStep);
  const [viewingStep, setViewingStep] = useState<PipelineStep | null>(
    progressStep
  );

  useEffect(() => {
    if (!progressStep) {
      previousProgressStep.current = null;
      setViewingStep(null);
      return;
    }

    setViewingStep((currentViewingStep) =>
      !currentViewingStep || currentViewingStep === previousProgressStep.current
        ? progressStep
        : currentViewingStep
    );
    previousProgressStep.current = progressStep;
  }, [progressStep]);

  const selectedStep = viewingStep ?? progressStep;
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

  const getStepStatus = (step: PipelineStep): PipelineStepStatus => {
    if (!progressStep) return 'pending';

    const progressIndex = PIPELINE_STEP_ORDER.indexOf(progressStep);
    const stepIndex = PIPELINE_STEP_ORDER.indexOf(step);
    if (generationStep === 'error' && step === progressStep) return 'error';
    if (stepIndex < progressIndex) return 'done';
    if (stepIndex === progressIndex)
      return generationStep === 'done' ? 'done' : 'active';
    return 'pending';
  };

  const statusLabel =
    generationStep === 'extract'
      ? genT('documentReceived')
      : generationStep === 'search'
        ? genT('webSearching')
        : generationStep === 'generate'
          ? genT('creatingCourseContent')
          : genT('savingCourseContent');

  return (
    <div className="mt-6 space-y-6 pb-2">
      <GenerationPipelineStepper
        getStepStatus={getStepStatus}
        getStepLabel={(step) => t(`pipeline.${step}`)}
        onStepSelect={setViewingStep}
        viewingStep={selectedStep}
      />

      {selectedStep === 'search' && (
        <SearchSourcesPreview
          sources={searchSourcesState}
          isSearching={generationStep === 'search'}
          labels={sourcePreviewLabels}
        />
      )}
      {selectedStep === 'generate' && (
        <CourseContentPreview courseContentDraft={courseContentDraft} />
      )}
      {(selectedStep === 'extract' || selectedStep === 'save') && (
        <div className="rounded-xl border bg-muted/20 px-4 py-5 text-center text-muted-foreground text-sm">
          {selectedStep === 'extract'
            ? genT('documentReceived')
            : genT('savingCourseContent')}
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
