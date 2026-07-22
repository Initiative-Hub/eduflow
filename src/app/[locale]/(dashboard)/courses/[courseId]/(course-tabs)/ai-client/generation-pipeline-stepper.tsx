import {
  BookOpen,
  Check,
  FileText,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { CourseContentPipelineStatus } from '@/lib/course-content/pipeline-state';
import { cn } from '@/lib/utils';

export type PipelineStep = 'extract' | 'search' | 'generate' | 'save';
export type PipelineStepStatus = CourseContentPipelineStatus;

export const PIPELINE_STEP_ORDER: PipelineStep[] = [
  'extract',
  'search',
  'generate',
  'save',
];

const pipelineSteps: { key: PipelineStep; icon: ReactNode }[] = [
  { key: 'extract', icon: <FileText className="h-5 w-5" /> },
  { key: 'search', icon: <Globe className="h-5 w-5" /> },
  { key: 'generate', icon: <Sparkles className="h-5 w-5" /> },
  { key: 'save', icon: <BookOpen className="h-5 w-5" /> },
];

type GenerationPipelineStepperProps = {
  getStepStatus: (step: PipelineStep) => PipelineStepStatus;
  getStepLabel: (step: PipelineStep) => string;
  onStepSelect: (step: PipelineStep) => void;
  viewingStep: PipelineStep | null;
};

export function GenerationPipelineStepper({
  getStepStatus,
  getStepLabel,
  onStepSelect,
  viewingStep,
}: GenerationPipelineStepperProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      {pipelineSteps.map((step, idx) => {
        const status = getStepStatus(step.key);
        const isViewing = viewingStep === step.key;
        const isAvailable = status !== 'pending';

        return (
          <div
            key={step.key}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {idx > 0 && (
              <div
                className={cn(
                  'absolute top-6 right-1/2 h-0.5 w-full transition-colors duration-300',
                  status !== 'pending' ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
            <button
              type="button"
              disabled={!isAvailable}
              aria-current={isViewing ? 'step' : undefined}
              className="relative z-10 flex min-h-20 w-full cursor-pointer flex-col items-center gap-2 rounded-lg outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
              onClick={() => onStepSelect(step.key)}
            >
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300',
                  status === 'completed' &&
                    'border-primary bg-primary text-primary-foreground',
                  status === 'running' &&
                    'border-primary bg-primary text-primary-foreground',
                  status === 'failed' &&
                    'border-destructive bg-destructive/10 text-destructive',
                  status === 'skipped' &&
                    'border-muted-foreground/50 bg-muted text-muted-foreground',
                  status === 'pending' &&
                    'border-muted bg-muted text-muted-foreground',
                  isViewing && 'ring-2 ring-ring ring-offset-2'
                )}
              >
                {status === 'completed' ? (
                  <Check className="h-5 w-5" />
                ) : status === 'running' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  step.icon
                )}
              </span>
              <span
                className={cn(
                  'text-center font-medium text-[11px] transition-colors duration-200',
                  status === 'running' && 'text-primary',
                  status === 'completed' && 'text-primary/70',
                  status === 'failed' && 'text-destructive',
                  status === 'skipped' && 'text-muted-foreground',
                  status === 'pending' && 'text-muted-foreground'
                )}
              >
                {getStepLabel(step.key)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
