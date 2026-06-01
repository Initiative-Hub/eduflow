'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { QuizForm, type QuizFormSubmitData } from '@/components/quiz/quiz-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useModules } from '../use-modules';
import { useQuestionBank } from '../use-question-bank';

interface CreateQuizDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  preselectedModuleId?: string;
  lessonId?: string;
  moduleName?: string;
}

export function CreateQuizDialog({
  isOpen,
  onOpenChange,
  courseId,
  preselectedModuleId,
  lessonId,
  moduleName,
}: CreateQuizDialogProps) {
  const t = useTranslations('Courses.CreateQuiz');
  const { modules } = useModules(courseId);
  const { createQuiz, isCreatingQuiz } = useQuestionBank({ courseId });
  const submitRef = useRef<(() => void) | null>(null);

  // Get lessons from the preselected module or all modules
  const availableLessons = preselectedModuleId
    ? (modules.find((m) => m.id === preselectedModuleId)?.lessons ?? [])
    : modules.flatMap((m) => m.lessons);

  const handleSubmit = (data: QuizFormSubmitData) => {
    const lessonIds =
      data.contentSource === 'all-modules'
        ? availableLessons.map((l) => l.id)
        : data.selectedLessonIds;

    createQuiz(
      {
        lessonIds,
        title: data.title,
        description: data.description || undefined,
        category: data.category,
        subType: data.subType,
        deliveryMode: data.deliveryMode,
        selectionMethod: 'HAND_PICK',
        questionCount: data.questionCount,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-8 py-5">
          <DialogTitle className="font-bold text-xl">{t('title')}</DialogTitle>
          <DialogDescription className="mt-1">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <QuizForm
            modules={modules}
            availableLessons={availableLessons}
            onSubmit={handleSubmit}
            isSubmitting={isCreatingQuiz}
            compact
            hideLessonSelector={!!lessonId}
            preselectedLessonId={lessonId}
            moduleName={moduleName}
            onSubmitReady={(submit) => {
              submitRef.current = submit;
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-8 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => submitRef.current?.()}
            disabled={isCreatingQuiz}
          >
            {isCreatingQuiz ? t('creating') : t('generateQuiz')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
