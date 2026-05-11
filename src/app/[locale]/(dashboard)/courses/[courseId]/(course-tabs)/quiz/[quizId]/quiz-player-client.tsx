'use client';

import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Quiz } from '@/components/quiz';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DELIVERY_MODE_LABELS,
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuizContent,
  type ScoreResult,
} from '@/lib/quiz-template';
import { LessonOutline } from '../../../lessons/[lessonId]/_components/lesson-outline';
import { useModules } from '../../../use-modules';
import { useQuestionBank } from '../../../use-question-bank';

interface QuizPlayerClientProps {
  courseId: string;
  quizId: string;
}

export function QuizPlayerClient({ courseId, quizId }: QuizPlayerClientProps) {
  const t = useTranslations('Courses.QuizPlayer');
  const router = useRouter();
  const { quizzes, isLoadingQuizzes } = useQuestionBank({ courseId });
  const { modules, isLoading: isModulesLoading } = useModules(courseId);
  const [showOutline, setShowOutline] = useState(false);

  const quiz = useMemo(
    () => quizzes.find((q) => q.id === quizId),
    [quizzes, quizId]
  );

  const quizContent: QuizContent | null = useMemo(() => {
    if (!quiz) return null;
    return {
      title: quiz.title,
      description: quiz.description ?? '',
      type: quiz.subType,
      questions: quiz.questions,
    };
  }, [quiz]);

  // Find the module title for breadcrumb
  const currentModule = useMemo(() => {
    if (!quiz) return null;
    return modules.find((m) => m.lessons.some((l) => l.id === quiz.lessonId));
  }, [modules, quiz]);

  // Build navigation: prev/next considering lessons and quizzes in sequence
  const { prev, next } = useMemo(() => {
    if (!quiz || !modules.length) return { prev: null, next: null };

    // Build a flat list of all items (lessons and quizzes) in order
    type NavItem = {
      type: 'lesson' | 'quiz';
      id: string;
      title: string;
      href: string;
    };

    const allItems: NavItem[] = [];
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        allItems.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          href: `/courses/${courseId}/lessons/${lesson.id}`,
        });
        // Add quizzes for this lesson right after the lesson
        const lessonQuizzes = quizzes.filter((q) => q.lessonId === lesson.id);
        for (const lq of lessonQuizzes) {
          allItems.push({
            type: 'quiz',
            id: lq.id,
            title: lq.title,
            href: `/courses/${courseId}/quiz/${lq.id}`,
          });
        }
      }
    }

    const currentIdx = allItems.findIndex(
      (item) => item.type === 'quiz' && item.id === quizId
    );
    if (currentIdx === -1) return { prev: null, next: null };

    return {
      prev: currentIdx > 0 ? allItems[currentIdx - 1] : null,
      next: currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null,
    };
  }, [quiz, modules, quizzes, quizId, courseId]);

  const handleComplete = (result: ScoreResult) => {
    toast.success(t('completed', { score: Math.round(result.percentage) }));
  };

  if (isLoadingQuizzes || isModulesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
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

  return (
    <>
      {/* Header bar — same layout as lesson page */}
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

      {/* Quiz Player */}
      <div className="mx-auto mt-6 max-w-2xl">
        <Quiz
          quiz={quizContent}
          deliveryMode={quiz.deliveryMode}
          onComplete={handleComplete}
        />
      </div>

      {/* Pagination — same layout as lesson page */}
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
    </>
  );
}
