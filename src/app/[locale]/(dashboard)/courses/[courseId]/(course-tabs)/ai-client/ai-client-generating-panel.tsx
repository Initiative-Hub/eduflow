import { Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CourseContentPipelineState } from '@/lib/course-content/pipeline-state';
import type { CourseContentSearchSourcesState } from '@/lib/course-content/search-source-state';
import type {
  CourseContentDraft,
  GenerationPipelineStep,
  GenerationStep,
} from '../../use-generate-course-content';
import { CourseContentPreview } from './course-content-preview';
import { CourseContentSearchStep } from './course-content-search-step';
import {
  GenerationPipelineStepper,
  PIPELINE_STEP_ORDER,
  type PipelineStep,
  type PipelineStepStatus,
} from './generation-pipeline-stepper';

type AiClientGeneratingPanelProps = {
  generationStep: GenerationStep;
  lastStartedStep: GenerationPipelineStep | null;
  pipelineState?: CourseContentPipelineState;
  generationError: string | null;
  courseContentDraft: CourseContentDraft | null | undefined;
  searchSources?: CourseContentSearchSourcesState;
  searchFailureMessage?: string | null;
  isSearchSkipAvailable?: boolean;
  isSearchSkipRequested?: boolean;
  searchSkipError?: string | null;
  onSkipSearch?: () => Promise<void>;
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
  pipelineState,
  generationError,
  courseContentDraft,
  searchSources,
  searchFailureMessage,
  isSearchSkipAvailable = false,
  isSearchSkipRequested: isSearchSkipRequestedFromStream = false,
  searchSkipError,
  onSkipSearch,
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
  const [skipRequested, setSkipRequested] = useState(false);

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

  useEffect(() => {
    if (generationStep !== 'search') setSkipRequested(false);
  }, [generationStep]);

  const selectedStep = viewingStep ?? progressStep;
  const searchSourcesState = searchSources ?? {
    web: [],
    youtube: [],
    completed: { web: false, youtube: false },
  };

  const getStepStatus = (step: PipelineStep): PipelineStepStatus => {
    if (pipelineState) return pipelineState[step];
    if (!progressStep) return 'pending';

    const progressIndex = PIPELINE_STEP_ORDER.indexOf(progressStep);
    const stepIndex = PIPELINE_STEP_ORDER.indexOf(step);
    if (generationStep === 'error' && step === progressStep) return 'failed';
    if (stepIndex < progressIndex) return 'completed';
    if (stepIndex === progressIndex)
      return generationStep === 'done' ? 'completed' : 'running';
    return 'pending';
  };

  const isSearchSkipRequested =
    skipRequested || isSearchSkipRequestedFromStream;
  const handleSkipSearch = async () => {
    if (!onSkipSearch) return;

    setSkipRequested(true);
    try {
      await onSkipSearch();
    } catch {
      setSkipRequested(false);
    }
  };

  let statusLabel: string;

  switch (generationStep) {
    case 'idle':
      statusLabel = genT('documentReceiving');
      break;
    case 'extract':
      statusLabel = genT('documentReceived');
      break;
    case 'search':
      statusLabel = isSearchSkipRequested
        ? genT('skippingWebSearch')
        : genT('webSearching');
      break;
    case 'generate':
      statusLabel = genT('creatingCourseContent');
      break;
    case 'save':
      statusLabel = genT('savingCourseContent');
      break;
    case 'done':
      statusLabel = genT('success');
      break;
    default:
      statusLabel = genT('error');
  }

  return (
    <div className="mt-6 space-y-6 pb-2">
      <GenerationPipelineStepper
        getStepStatus={getStepStatus}
        getStepLabel={(step) => t(`pipeline.${step}`)}
        onStepSelect={setViewingStep}
        viewingStep={selectedStep}
      />

      {selectedStep === 'search' && (
        <CourseContentSearchStep
          sources={searchSourcesState}
          status={getStepStatus('search')}
          isSearching={generationStep === 'search'}
          failureMessage={searchFailureMessage}
          isSkipAvailable={isSearchSkipAvailable}
          isSkipRequested={isSearchSkipRequested}
          skipError={searchSkipError}
          onSkip={handleSkipSearch}
        />
      )}
      {selectedStep === 'generate' && (
        <CourseContentPreview courseContentDraft={courseContentDraft} />
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
        <div
          role="status"
          className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{statusLabel}</span>
        </div>
      )}
    </div>
  );
}
