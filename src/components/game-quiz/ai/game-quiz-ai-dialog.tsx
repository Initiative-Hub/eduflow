'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GameQuizCopy } from '../copy';
import type { GameQuizDifficulty, GeneratedGameQuizQuestion } from '../types';
import { GameQuizAiGuidanceStep } from './game-quiz-ai-guidance-step';
import { GameQuizAiReviewStep } from './game-quiz-ai-review-step';
import { GameQuizAiSourceStep } from './game-quiz-ai-source-step';
import {
  type GameQuizAiDialogStep,
  useGameQuizAiDialog,
} from './use-game-quiz-ai-dialog';

interface GameQuizAiDialogProps {
  copy: GameQuizCopy;
  difficulty: GameQuizDifficulty;
  isOpen: boolean;
  maxQuestionCount: number;
  topic: string;
  onAccept: (questions: GeneratedGameQuizQuestion[]) => void;
  onOpenChange: (open: boolean) => void;
}

const stepOrder: GameQuizAiDialogStep[] = ['sources', 'guidance', 'review'];

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }
  return fallback;
}

export function GameQuizAiDialog({
  copy,
  difficulty,
  isOpen,
  maxQuestionCount,
  topic,
  onAccept,
  onOpenChange,
}: GameQuizAiDialogProps) {
  const dialog = useGameQuizAiDialog({
    isOpen,
    maxQuestionCount,
    topic,
    difficulty,
    onOpenChange,
    onAccept,
  });
  const courses = dialog.sourcesQuery.data?.courses ?? [];
  const selectedCourse = courses.find(
    (course) => course.id === dialog.courseId
  );
  const selectedLessonIds = new Set(
    selectedCourse?.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.id)
    ) ?? []
  );
  const validSelectedLessonCount = dialog.lessonIds.filter((id) =>
    selectedLessonIds.has(id)
  ).length;
  const canContinue = Boolean(
    dialog.courseId &&
      validSelectedLessonCount === dialog.lessonIds.length &&
      validSelectedLessonCount > 0
  );
  const currentStepIndex = stepOrder.indexOf(dialog.step);
  const stepLabels: Record<GameQuizAiDialogStep, string> = {
    sources: copy.aiGenerate.sourcesStep,
    guidance: copy.aiGenerate.guidanceStep,
    review: copy.aiGenerate.reviewStep,
  };
  const currentQuestion = dialog.generatedQuestions[dialog.reviewIndex];
  const generationError = dialog.generationMutation.isError
    ? getErrorMessage(
        dialog.generationMutation.error,
        copy.aiGenerate.generationErrorDescription
      )
    : undefined;

  const footer =
    dialog.step === 'sources' ? (
      <>
        <Button
          type="button"
          onClick={() => dialog.handleOpenChange(false)}
          variant="ghost"
        >
          {copy.common.cancel}
        </Button>
        <Button
          type="button"
          disabled={!canContinue}
          onClick={() => dialog.setStep('guidance')}
        >
          {copy.aiGenerate.continue}
          <ChevronRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </>
    ) : dialog.step === 'guidance' ? (
      <>
        <Button
          type="button"
          disabled={dialog.generationMutation.isPending}
          onClick={() => dialog.setStep('sources')}
          variant="ghost"
        >
          <ChevronLeft data-icon="inline-start" aria-hidden="true" />
          {copy.common.back}
        </Button>
        <Button
          type="button"
          disabled={dialog.generationMutation.isPending}
          onClick={dialog.generate}
        >
          {dialog.generationMutation.isPending ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : (
            <Sparkles data-icon="inline-start" aria-hidden="true" />
          )}
          {dialog.generationMutation.isPending
            ? copy.aiGenerate.generating
            : copy.aiGenerate.generate}
        </Button>
      </>
    ) : (
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            aria-label={copy.aiGenerate.previousQuestion}
            disabled={dialog.reviewIndex === 0}
            onClick={() =>
              dialog.setReviewIndex((index) => Math.max(0, index - 1))
            }
            size="icon"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            aria-label={copy.aiGenerate.nextQuestion}
            disabled={
              dialog.reviewIndex >= dialog.generatedQuestions.length - 1
            }
            onClick={() =>
              dialog.setReviewIndex((index) =>
                Math.min(dialog.generatedQuestions.length - 1, index + 1)
              )
            }
            size="icon"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={dialog.reject} variant="ghost">
            {copy.aiGenerate.reject}
          </Button>
          <Button type="button" onClick={dialog.accept}>
            <Check data-icon="inline-start" aria-hidden="true" />
            {copy.aiGenerate.accept}
          </Button>
        </div>
      </div>
    );

  return (
    <DialogTemplate
      className="max-h-[90dvh] w-[calc(100%-2rem)] sm:max-w-2xl"
      description={copy.aiGenerate.description}
      footer={footer}
      isOpen={isOpen}
      onOpenChange={dialog.handleOpenChange}
      title={copy.aiGenerate.title}
    >
      <div className="flex flex-col gap-5">
        <nav
          aria-label={copy.aiGenerate.title}
          className="flex flex-wrap items-center gap-2"
        >
          {stepOrder.map((step, index) => (
            <Badge
              key={step}
              variant={
                index === currentStepIndex
                  ? 'default'
                  : index < currentStepIndex
                    ? 'secondary'
                    : 'outline'
              }
            >
              {index + 1}. {stepLabels[step]}
            </Badge>
          ))}
        </nav>

        <div className="max-h-[58dvh] overflow-y-auto px-0.5 py-1">
          {dialog.step === 'sources' ? (
            <GameQuizAiSourceStep
              copy={copy}
              courseId={dialog.courseId}
              courses={courses}
              isError={dialog.sourcesQuery.isError}
              isPending={dialog.sourcesQuery.isPending}
              lessonIds={dialog.lessonIds}
              onCourseChange={dialog.setCourseId}
              onLessonToggle={dialog.toggleLesson}
              onRetry={() => dialog.sourcesQuery.refetch()}
            />
          ) : dialog.step === 'guidance' ? (
            <GameQuizAiGuidanceStep
              additionalPrompt={dialog.additionalPrompt}
              copy={copy}
              generationError={generationError}
              maxQuestionCount={maxQuestionCount}
              onAdditionalPromptChange={dialog.setAdditionalPrompt}
              onQuestionCountChange={dialog.setQuestionCount}
              questionCount={dialog.questionCount}
            />
          ) : (
            <GameQuizAiReviewStep
              copy={copy}
              currentIndex={dialog.reviewIndex}
              question={currentQuestion}
              totalQuestions={dialog.generatedQuestions.length}
            />
          )}
        </div>
      </div>
    </DialogTemplate>
  );
}
