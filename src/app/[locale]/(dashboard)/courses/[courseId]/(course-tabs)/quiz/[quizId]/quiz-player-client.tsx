'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Menu,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Quiz, QuizQuestionsEditor } from '@/components/quiz';
import { QuizResult } from '@/components/quiz/quiz-result';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCourseNavigation } from '@/hooks/use-course-navigation';
import { apiClient } from '@/lib/api/api-client';
import { useSession } from '@/lib/auth-client';
import {
  DELIVERY_MODE_LABELS,
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuizContent,
  type ScoreResult,
  type StudentAnswer,
  type StudentAnswers,
  SUB_TYPE_TO_QUESTION_TYPE,
} from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { LessonOutline } from '../../../lessons/[lessonId]/_components/lesson-outline';
import { useModules } from '../../../use-modules';
import { useQuestionBank } from '../../../use-question-bank';
import { useQuiz } from '../use-quiz';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuizAttemptResponse {
  id: string;
  quizId: string;
  userId: string;
  answers: Record<string, StudentAnswer>;
  score: number;
  maxScore: number;
  percentage: number;
  results: Array<{
    questionIndex: number;
    isCorrect: boolean;
    earnedPoints: number;
    maxPoints: number;
    pendingReview?: boolean;
  }>;
  hasPendingReview: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QuizPlayerClientProps {
  courseId: string;
  quizId: string;
}

export function QuizPlayerClient({ courseId, quizId }: QuizPlayerClientProps) {
  const t = useTranslations('Courses.QuizPlayer');
  const router = useRouter();
  const { quizzes, isLoadingQuizzes, isQuizzesError, refetchQuizzes } =
    useQuestionBank({ courseId });
  const { modules, isLoading: isModulesLoading } = useModules(courseId);
  const [showOutline, setShowOutline] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [activeTab, setActiveTab] = useState<'take' | 'edit'>('take');

  const { data: sessionData } = useSession();
  const queryClient = useQueryClient();
  const isTeacher =
    sessionData?.user.role === 'TEACHER' || sessionData?.user.role === 'ADMIN';

  const { saveQuestions, isSavingQuestions } = useQuiz({ courseId, quizId });

  const quiz = useMemo(
    () => quizzes.find((q) => q.id === quizId),
    [quizzes, quizId]
  );

  const quizContent: QuizContent | null = useMemo(() => {
    if (!quiz) return null;
    return {
      title: quiz.title,
      description: quiz.description ?? '',
      type: SUB_TYPE_TO_QUESTION_TYPE[quiz.subType] ?? quiz.subType,
      questions: quiz.questions,
    };
  }, [quiz]);

  // Fetch previous attempts for this quiz
  const attemptsQuery = useQuery({
    queryKey: ['quiz-attempts', quizId],
    queryFn: async (): Promise<QuizAttemptResponse[]> => {
      return apiClient.get<QuizAttemptResponse[]>(
        `v1/quizzes/${quizId}/attempts`
      );
    },
    enabled: !!quizId,
  });

  const mostRecentAttempt = attemptsQuery.data?.[0] ?? null;

  // Convert the most recent attempt into ScoreResult + StudentAnswers for display
  const previousResult: ScoreResult | null = useMemo(() => {
    if (!mostRecentAttempt) return null;
    return {
      totalPoints: mostRecentAttempt.maxScore,
      earnedPoints: mostRecentAttempt.score,
      percentage: mostRecentAttempt.percentage,
      questionResults: mostRecentAttempt.results,
      hasPendingReview: mostRecentAttempt.hasPendingReview,
    };
  }, [mostRecentAttempt]);

  const previousAnswers: StudentAnswers = useMemo(() => {
    if (!mostRecentAttempt) return new Map();
    const map: StudentAnswers = new Map();
    for (const [indexStr, answer] of Object.entries(
      mostRecentAttempt.answers
    )) {
      const index = Number.parseInt(indexStr, 10);
      if (!Number.isNaN(index)) {
        map.set(index, answer);
      }
    }
    return map;
  }, [mostRecentAttempt]);

  // Find the module title for breadcrumb
  const currentModule = useMemo(() => {
    if (!quiz) return null;
    return modules.find((m) => m.lessons.some((l) => l.id === quiz.lessonId));
  }, [modules, quiz]);

  // Build navigation: prev/next considering lessons and quizzes in sequence
  const { prev, next } = useCourseNavigation(
    courseId,
    quizId,
    'quiz',
    modules,
    quizzes
  );

  const handleComplete = (result: ScoreResult) => {
    toast.success(t('completed', { score: Math.round(result.percentage) }));
    // Refetch attempts so the latest shows up
    attemptsQuery.refetch();
    setIsRetaking(false);
  };

  const handleRetake = useCallback(() => {
    setIsRetaking(true);
  }, []);

  if (isLoadingQuizzes || isModulesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (isQuizzesError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/50 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-lg">
              {t('loadError')}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t('loadErrorDescription')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchQuizzes()}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (!quiz || !quizContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b pb-4">
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-bold text-foreground text-xl">{t('notFound')}</h1>
        </div>
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center text-muted-foreground">
          {t('notFoundDescription')}
        </div>
      </div>
    );
  }

  // Determine whether to show previous result or the quiz player
  const showPreviousResult =
    previousResult && !isRetaking && !attemptsQuery.isLoading;

  return (
    <>
      {/* Header bar */}
      <div className="sticky top-0 z-40 -mx-6 -mt-6 flex items-center justify-between border-foreground/20 border-b bg-background/95 px-6 py-3 backdrop-blur-sm md:-mx-10 md:-mt-10 md:px-10 lg:-mx-12 lg:-mt-12 lg:px-12">
        <div className="mr-4 flex items-center gap-2 text-muted-foreground text-sm">
          <Popover open={showOutline} onOpenChange={setShowOutline}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 -ml-2 h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted/60"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="flex h-[66vh] w-80 flex-col overflow-hidden p-0"
            >
              <LessonOutline
                courseId={courseId}
                onSelectLesson={(id) => {
                  setShowOutline(false);
                  router.push(`/courses/${courseId}/lessons/${id}`);
                }}
                className="h-full w-full border-none bg-transparent"
              />
            </PopoverContent>
          </Popover>
          <Link
            href={`/courses/${courseId}`}
            className="max-w-30 truncate transition-colors hover:text-primary md:max-w-50"
          >
            {currentModule?.title ?? t('course')}
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
          <span className="max-w-37.5 truncate font-medium text-foreground md:max-w-xs">
            {quiz.title}
          </span>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-1 rounded-lg border border-muted bg-muted/40 p-0.5">
            <Button
              variant={activeTab === 'take' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setActiveTab('take')}
              className="h-7 cursor-pointer px-3 font-semibold text-xs"
            >
              {t('studentView')}
            </Button>
            <Button
              variant={activeTab === 'edit' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setActiveTab('edit')}
              className="h-7 cursor-pointer px-3 font-semibold text-xs"
            >
              {t('editQuestions')}
            </Button>
          </div>
        )}
      </div>

      {/* Quiz metadata */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {QUIZ_CATEGORIES[quiz.category].label}
        </Badge>
        <Badge variant="outline">
          {QUESTION_SUB_TYPE_LABELS[quiz.subType]}
        </Badge>
        <Badge variant="outline">
          {DELIVERY_MODE_LABELS[quiz.deliveryMode]}
        </Badge>
        <Badge variant="outline">
          {quiz.questionCount}{' '}
          {quiz.questionCount === 1 ? 'question' : 'questions'}
        </Badge>
      </div>

      {/* Quiz Player or Previous Result */}
      <div className="mx-auto mt-6 max-w-2xl">
        {activeTab === 'edit' ? (
          <QuizQuestionsEditor
            initialQuestions={(quiz.questions ?? []) as QuestionBlock[]}
            onSave={saveQuestions}
            isSaving={isSavingQuestions}
          />
        ) : showPreviousResult ? (
          <QuizResult
            result={previousResult}
            quiz={quizContent}
            answers={previousAnswers}
            onRetry={handleRetake}
          />
        ) : (
          <Quiz
            quiz={quizContent}
            quizId={quizId}
            deliveryMode={quiz.deliveryMode}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Pagination */}
      {activeTab !== 'edit' && (
        <div className="flex w-full flex-col">
          <div className="mt-12 flex items-center justify-between border-t pt-6 font-medium">
            {prev ? (
              <Button variant="outline" asChild className="h-auto px-4 py-3">
                <Link href={prev.href}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  <span className="max-w-37.5 truncate md:max-w-50">
                    {prev.title}
                  </span>
                </Link>
              </Button>
            ) : (
              <div />
            )}

            {next ? (
              <Button variant="outline" asChild className="h-auto px-4 py-3">
                <Link href={next.href}>
                  <span className="max-w-37.5 truncate md:max-w-50">
                    {next.title}
                  </span>
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}
    </>
  );
}
