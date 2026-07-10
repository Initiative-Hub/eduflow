'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { QuizQuestionsEditor } from '@/components/quiz/editors/quiz-questions-editor';
import { Button } from '@/components/ui/button';
import {
  type DeliveryMode,
  getQuestionTaxonomy,
  type QuestionSubType,
} from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { useModules } from '../../../use-modules';
import { useQuestionBank } from '../../../use-question-bank';
import { QuizAiDraftDialog } from './quiz-ai-draft-dialog';
import { QuizDetailsForm } from './quiz-details-form';

interface CreateQuizClientProps {
  courseId: string;
  preselectedModuleId?: string;
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
    questions: questionBank,
    createQuiz,
    isCreatingQuiz,
    generateDraftQuiz,
    isGeneratingDraftQuiz,
  } = useQuestionBank({ courseId });
  const availableLessons = preselectedModuleId
    ? (modules.find((module) => module.id === preselectedModuleId)?.lessons ??
      [])
    : modules.flatMap((module) => module.lessons);
  const initialLessonIds = lessonId
    ? [lessonId]
    : preselectedModuleId
      ? availableLessons.map((lesson) => lesson.id)
      : [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonIds, setLessonIds] = useState(initialLessonIds);
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>('INSTANT_FEEDBACK');
  const [showErrors, setShowErrors] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const appendGeneratedRef = useRef<
    ((questions: QuestionBlock[]) => void) | null
  >(null);

  const handleOpenAi = (
    appendQuestions: (questions: QuestionBlock[]) => void
  ) => {
    appendGeneratedRef.current = appendQuestions;
    if (lessonIds.length === 0) {
      setShowErrors(true);
      return;
    }
    setIsAiDialogOpen(true);
  };

  const handleGenerate = (data: {
    questionCounts: Partial<Record<QuestionSubType, number>>;
    context?: string;
  }) => {
    generateDraftQuiz(
      { lessonIds, ...data },
      {
        onSuccess: ({ questions }) => {
          appendGeneratedRef.current?.(questions);
          setIsAiDialogOpen(false);
        },
      }
    );
  };

  const handleSave = (
    draftQuestions: QuestionBlock[],
    questionIds: Array<string | null>
  ) => {
    setShowErrors(true);
    if (!title.trim() || lessonIds.length === 0) return;

    const questionCounts = draftQuestions.reduce<
      Partial<Record<QuestionSubType, number>>
    >((counts, question) => {
      try {
        const { subType } = getQuestionTaxonomy(question.type);
        counts[subType] = (counts[subType] ?? 0) + 1;
      } catch {
        // Unsupported legacy types are still saved but omitted from distribution.
      }
      return counts;
    }, {});

    createQuiz(
      {
        lessonIds,
        title: title.trim(),
        description: description.trim() || undefined,
        questionCounts,
        deliveryMode,
        selectionMethod: 'MANUAL_CREATE',
        questionCount: draftQuestions.length,
        questions: draftQuestions,
        questionIds,
      },
      {
        onSuccess: (quiz) =>
          router.push(`/courses/${courseId}/quiz/${quiz.id}?tab=edit`),
      }
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      <header className="flex items-start gap-3 border-b pb-5">
        <Button variant="ghost" size="icon" className="mt-0.5" asChild>
          <Link href={`/courses/${courseId}`} aria-label={t('back')}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
            {t('workspaceDescription')}
          </p>
        </div>
      </header>

      <QuizDetailsForm
        title={title}
        description={description}
        lessonIds={lessonIds}
        lessons={availableLessons}
        deliveryMode={deliveryMode}
        showErrors={showErrors}
        hideLessonSelector={!!lessonId}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onLessonIdsChange={setLessonIds}
        onDeliveryModeChange={setDeliveryMode}
      />

      <section className="rounded-2xl border bg-card p-5 md:p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-lg">{t('draftQuestionsTitle')}</h2>
        </div>
        <QuizQuestionsEditor
          initialQuestions={[]}
          questionBank={questionBank}
          onSave={handleSave}
          isSaving={isCreatingQuiz}
          onGenerateAI={handleOpenAi}
          isGeneratingAI={isGeneratingDraftQuiz}
          creationMode
        />
      </section>

      <QuizAiDraftDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        isGenerating={isGeneratingDraftQuiz}
        onSubmit={handleGenerate}
      />
    </div>
  );
}
