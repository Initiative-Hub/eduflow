'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QuizForm, type QuizFormSubmitData } from '@/components/quiz/quiz-form';
import { Button } from '@/components/ui/button';
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
  const { createQuiz, isCreatingQuiz } = useQuestionBank({ courseId });

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
        onSuccess: () => router.push(`/courses/${courseId}`),
      }
    );
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
        hideLessonSelector={!!lessonId}
        preselectedLessonId={lessonId}
        renderFooter={(submitForm) => (
          <div className="flex items-center justify-between border-t pt-6">
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
