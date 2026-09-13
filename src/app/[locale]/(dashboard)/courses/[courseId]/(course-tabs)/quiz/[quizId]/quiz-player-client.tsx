'use client';

import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { CourseQuizAttempt } from '@/components/quiz/course-quiz-attempt';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourseNavigation } from '@/hooks/use-course-navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/auth-client';
import { LessonOutline } from '../../../lessons/[lessonId]/_components/lesson-outline';
import { useModules } from '../../../use-modules';
import { useQuestionBank } from '../../../use-question-bank';
import { CourseQuizEditor } from './course-quiz-editor';

export function QuizPlayerClient({
  courseId,
  quizId,
}: {
  courseId: string;
  quizId: string;
}) {
  const t = useTranslations('Courses.QuizPlayer');
  const router = useRouter();
  const params = useSearchParams();
  const { quizzes, isLoadingQuizzes, isQuizzesError, refetchQuizzes } =
    useQuestionBank({ courseId, loadQuestions: false });
  const { modules, isLoading } = useModules(courseId);
  const { data: session } = useSession();
  const canEdit =
    session?.user.role === 'TEACHER' || session?.user.role === 'ADMIN';
  const editing = canEdit && params.get('tab') === 'edit';
  const action = params.get('action');
  const initialEditorAction =
    action === 'manual' || action === 'question-bank' ? action : undefined;
  const [outline, setOutline] = useState(false);
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  const registerFlush = useCallback((flush: (() => Promise<void>) | null) => {
    flushRef.current = flush;
  }, []);
  const quiz = quizzes.find((q) => q.id === quizId);
  const { prev, next } = useCourseNavigation(
    courseId,
    quizId,
    'quiz',
    modules,
    quizzes
  );
  const navigate = async (href: string) => {
    try {
      await flushRef.current?.();
      router.push(href);
    } catch {
      /* The attempt workspace shows save failures. */
    }
  };
  if (isLoadingQuizzes || isLoading)
    return <Skeleton className="h-64 w-full" />;
  if (isQuizzesError)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t('loadError')}
          <Button onClick={() => void refetchQuizzes()}>{t('retry')}</Button>
        </AlertDescription>
      </Alert>
    );
  if (!quiz)
    return (
      <Alert>
        <AlertDescription>{t('notFoundDescription')}</AlertDescription>
      </Alert>
    );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <Popover open={outline} onOpenChange={setOutline}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('course')}>
                <Menu />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="h-[66vh] w-80 overflow-hidden p-0">
              <LessonOutline
                courseId={courseId}
                onSelectLesson={(id) => {
                  setOutline(false);
                  void navigate(`/courses/${courseId}/lessons/${id}`);
                }}
                className="h-full w-full"
              />
            </PopoverContent>
          </Popover>
          <Link href={`/courses/${courseId}`}>{t('course')}</Link>
          <ChevronRight />
          <h1 className="truncate font-semibold">{quiz.title}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant={editing ? 'ghost' : 'secondary'}
              onClick={() =>
                void navigate(`/courses/${courseId}/quiz/${quizId}`)
              }
            >
              {t('studentView')}
            </Button>
            <Button
              variant={editing ? 'secondary' : 'ghost'}
              onClick={() =>
                void navigate(`/courses/${courseId}/quiz/${quizId}?tab=edit`)
              }
            >
              {t('editQuestions')}
            </Button>
          </div>
        )}
      </div>
      <div
        className={
          editing
            ? 'mx-auto flex w-full max-w-5xl flex-col gap-6'
            : 'mx-auto w-full max-w-2xl'
        }
      >
        {editing ? (
          <CourseQuizEditor
            courseId={courseId}
            quizId={quizId}
            quiz={quiz}
            initialEditorAction={initialEditorAction}
          />
        ) : (
          <CourseQuizAttempt
            key={quizId}
            courseId={courseId}
            quizId={quizId}
            registerFlush={registerFlush}
            quiz={{
              title: quiz.title,
              description: quiz.description ?? '',
              type: quiz.questions[0]?.type ?? 'mixed',
              questions: quiz.questions,
            }}
          />
        )}
      </div>
      {!editing && (
        <nav className="flex justify-between gap-4 border-t pt-4">
          {prev ? (
            <Button variant="outline" asChild>
              <Link href={prev.href}>
                <ChevronLeft />
                {prev.title}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button variant="outline" asChild>
              <Link href={next.href}>
                {next.title}
                <ChevronRight />
              </Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
