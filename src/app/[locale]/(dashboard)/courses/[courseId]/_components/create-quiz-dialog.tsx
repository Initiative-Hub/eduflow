'use client';

import { useRouter } from 'next/navigation';
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
import type { QuestionSubType, QuizCategory } from '@/lib/quiz-template';
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
  const router = useRouter();
  const { modules } = useModules(courseId);
  const {
    createQuiz,
    isCreatingQuiz,
    generateQuestions,
    isGeneratingQuestions,
    generateQuestionsError,
  } = useQuestionBank({ courseId });
  const submitRef = useRef<(() => void) | null>(null);

  // Get lessons from the preselected module or all modules
  const availableLessons = preselectedModuleId
    ? (modules.find((m) => m.id === preselectedModuleId)?.lessons ?? [])
    : modules.flatMap((m) => m.lessons);

  const handleSubmit = (data: QuizFormSubmitData) => {
    const primaryLessonId =
      data.contentSource === 'all-modules'
        ? (availableLessons[0]?.id ?? '')
        : data.selectedLessonIds[0];

    createQuiz(
      {
        lessonId: primaryLessonId,
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
          router.push(`/courses/${courseId}`);
        },
      }
    );
  };

  const handleGenerateWithAI = async (params: {
    lessonIds: string[];
    category: QuizCategory;
    subType: QuestionSubType;
    count: number;
  }) => {
    if (params.lessonIds.length === 0) return;
    try {
      await generateQuestions({
        lessonId: params.lessonIds[0],
        category: params.category,
        subType: params.subType,
        count: params.count,
      });
    } catch {
      // handled by mutation
    }
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
            isGeneratingQuestions={isGeneratingQuestions}
            generateQuestionsError={generateQuestionsError}
            onGenerateWithAI={handleGenerateWithAI}
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
