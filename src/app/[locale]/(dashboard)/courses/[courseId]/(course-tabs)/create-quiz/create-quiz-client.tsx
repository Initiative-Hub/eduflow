'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QuizForm, type QuizFormSubmitData } from '@/components/quiz/quiz-form';
import { Button } from '@/components/ui/button';
import type { QuestionSubType, QuizCategory } from '@/lib/quiz-template';
import { useModules } from '../../use-modules';
import { useQuestionBank } from '../../use-question-bank';

interface CreateQuizClientProps {
  courseId: string;
  preselectedModuleId?: string;
  /** When provided, the lesson is pre-selected and the selector is hidden */
  lessonId?: string;
}

export function CreateQuizClient({
  courseId,
  preselectedModuleId,
  lessonId,
}: CreateQuizClientProps) {
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
        onSuccess: () => router.push(`/courses/${courseId}`),
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
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Form */}
      <QuizForm
        modules={modules}
        availableLessons={availableLessons}
        onSubmit={handleSubmit}
        isSubmitting={isCreatingQuiz}
        isGeneratingQuestions={isGeneratingQuestions}
        generateQuestionsError={generateQuestionsError}
        onGenerateWithAI={handleGenerateWithAI}
        hideLessonSelector={!!lessonId}
        preselectedLessonId={lessonId}
        renderFooter={(submitForm, generateWithAI) => (
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={generateWithAI}
              disabled={isGeneratingQuestions}
            >
              {isGeneratingQuestions ? (
                <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isGeneratingQuestions
                ? t('generatingQuestions')
                : t('aiGenerate')}
            </Button>
            <div className="flex items-center gap-3">
              <Link href={`/courses/${courseId}`}>
                <Button variant="ghost">{t('cancel')}</Button>
              </Link>
              <Button onClick={submitForm} disabled={isCreatingQuiz}>
                {isCreatingQuiz ? t('creating') : t('generateQuiz')}
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
