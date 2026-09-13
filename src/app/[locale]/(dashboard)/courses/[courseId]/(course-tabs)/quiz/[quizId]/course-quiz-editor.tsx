'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { QuizQuestionsEditor } from '@/components/quiz';
import type {
  DeliveryMode,
  QuestionSubType,
  QuizDefinition,
} from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { useModules } from '../../../use-modules';
import { useQuestionBank } from '../../../use-question-bank';
import { useQuiz } from '../use-quiz';
import { QuizAiDraftDialog } from '../create/quiz-ai-draft-dialog';
import { QuizDetailsForm } from '../create/quiz-details-form';
export function CourseQuizEditor({
  courseId,
  quizId,
  quiz,
  initialEditorAction,
}: {
  courseId: string;
  quizId: string;
  quiz: QuizDefinition;
  initialEditorAction?: 'manual' | 'question-bank';
}) {
  const t = useTranslations('Courses.QuizPlayer');
  const { modules } = useModules(courseId);
  const availableLessons = modules.flatMap((module) => module.lessons);
  const {
    questions: questionBank,
    generateDraftQuiz,
    isGeneratingDraftQuiz,
  } = useQuestionBank({ courseId });
  const { saveQuizDraft, isSavingQuizDraft } = useQuiz({ courseId, quizId });
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiDialogResetKey, setAiDialogResetKey] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLessonIds, setEditLessonIds] = useState<string[]>([]);
  const [editDeliveryMode, setEditDeliveryMode] =
    useState<DeliveryMode>('INSTANT_FEEDBACK');
  const [showEditErrors, setShowEditErrors] = useState(false);
  const appendGeneratedRef = useRef<
    ((questions: QuestionBlock[]) => void) | null
  >(null);

  useEffect(() => {
    if (!quiz) return;
    setEditTitle(quiz.title);
    setEditDescription(quiz.description ?? '');
    setEditLessonIds(quiz.lessonIds);
    setEditDeliveryMode(quiz.deliveryMode);
    setShowEditErrors(false);
  }, [quiz]);

  const handleOpenDraftAiDialog = useCallback(
    (appendQuestions: (questions: QuestionBlock[]) => void) => {
      appendGeneratedRef.current = appendQuestions;
      if (editLessonIds.length === 0) {
        setShowEditErrors(true);
        return;
      }
      setIsAiDialogOpen(true);
    },
    [editLessonIds.length]
  );

  const handleGenerateDraft = useCallback(
    (data: {
      questionCounts: Partial<Record<QuestionSubType, number>>;
      context?: string;
    }) => {
      generateDraftQuiz(
        { lessonIds: editLessonIds, ...data },
        {
          onSuccess: ({ questions }) => {
            appendGeneratedRef.current?.(questions);
            setIsAiDialogOpen(false);
            setAiDialogResetKey((current) => current + 1);
          },
        }
      );
    },
    [editLessonIds, generateDraftQuiz]
  );

  const handleSaveDraft = useCallback(
    (questions: QuestionBlock[], questionIds: Array<string | null>) => {
      setShowEditErrors(true);
      if (!editTitle.trim() || editLessonIds.length === 0) return;

      saveQuizDraft({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        lessonIds: editLessonIds,
        deliveryMode: editDeliveryMode,
        questions,
        questionIds,
      });
    },
    [editDeliveryMode, editDescription, editLessonIds, editTitle, saveQuizDraft]
  );

  return (
    <>
      <>
        <QuizDetailsForm
          title={editTitle}
          description={editDescription}
          lessonIds={editLessonIds}
          lessons={availableLessons}
          deliveryMode={editDeliveryMode}
          showErrors={showEditErrors}
          hideLessonSelector={false}
          onTitleChange={setEditTitle}
          onDescriptionChange={setEditDescription}
          onLessonIdsChange={setEditLessonIds}
          onDeliveryModeChange={setEditDeliveryMode}
        />

        <section className="rounded-2xl border bg-card p-5 md:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-lg">{t('questionsTitle')}</h2>
          </div>
          <QuizQuestionsEditor
            key={`${quiz.updatedAt}:${quiz.questionIds?.join(',') ?? ''}`}
            initialQuestions={quiz.questions ?? []}
            initialQuestionIds={quiz.questionIds ?? []}
            questionBank={questionBank}
            onSave={handleSaveDraft}
            isSaving={isSavingQuizDraft}
            onGenerateAI={handleOpenDraftAiDialog}
            isGeneratingAI={isGeneratingDraftQuiz}
            initialAction={initialEditorAction}
            creationMode
          />
        </section>
      </>
      <QuizAiDraftDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSubmit={handleGenerateDraft}
        isGenerating={isGeneratingDraftQuiz}
        resetKey={aiDialogResetKey}
      />
    </>
  );
}
