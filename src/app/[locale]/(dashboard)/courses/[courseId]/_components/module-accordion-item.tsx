import { BookOpen, ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { QuizDefinition } from '@/lib/quiz-template';
import {
  DELIVERY_MODE_LABELS,
  QUESTION_SUB_TYPE_LABELS,
} from '@/lib/quiz-template';
import type { Module } from '../use-modules';

interface ModuleAccordionItemProps {
  moduleItem: Module;
  courseId: string;
  /** Called with the module ID when the user clicks "Add lesson" */
  onAddLesson: (moduleId: string) => void;
  /** Called with the lesson ID when the user clicks "Create Quiz" on a lesson */
  onCreateQuiz: (lessonId: string) => void;
  /** Quizzes associated with lessons in this module */
  quizzes?: QuizDefinition[];
}

export function ModuleAccordionItem({
  moduleItem,
  courseId,
  onAddLesson,
  onCreateQuiz,
  quizzes = [],
}: ModuleAccordionItemProps) {
  const tAccordion = useTranslations('Courses.ModuleAccordion');
  const tDialog = useTranslations('Courses.AddLessonDialog');
  const tQuiz = useTranslations('Courses.CreateQuiz');

  // Get quizzes for lessons in this module
  const lessonIds = new Set(moduleItem.lessons.map((l) => l.id));
  const moduleQuizzes = quizzes.filter((q) => lessonIds.has(q.lessonId));

  // Map quizzes by lessonId for display
  const quizzesByLesson = new Map<string, QuizDefinition[]>();
  for (const quiz of moduleQuizzes) {
    const existing = quizzesByLesson.get(quiz.lessonId) ?? [];
    existing.push(quiz);
    quizzesByLesson.set(quiz.lessonId, existing);
  }

  return (
    <AccordionItem
      value={moduleItem.id}
      className="overflow-hidden rounded-md border bg-card shadow-sm"
    >
      <div className="group/module-row relative">
        <AccordionTrigger className="flex items-center justify-between border-b bg-muted/40 p-4 font-medium text-foreground transition-colors hover:bg-muted/60">
          <div className="flex w-full items-center justify-between pr-12">
            <span className="text-lg">{moduleItem.title}</span>
          </div>
        </AccordionTrigger>

        {/* Absolutely positioned so it doesn't nest inside the trigger */}
        <div className="absolute top-3.25 right-12 z-10 flex gap-1.5">
          <Button
            size="sm"
            variant="default"
            className="h-8 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddLesson(moduleItem.id);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {tDialog('submit')}
          </Button>
        </div>

        <AccordionContent className="m-0 border-none bg-card p-0 text-sm">
          <div className="divide-y">
            {moduleItem.lessons.length === 0 && moduleQuizzes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground italic">
                {tAccordion('noLessons')}
              </div>
            ) : (
              moduleItem.lessons.map((lesson) => (
                <div key={lesson.id}>
                  <div className="group flex items-center justify-between p-4 transition-colors duration-300 hover:bg-muted/50">
                    <Link
                      href={`/courses/${courseId}/lessons/${lesson.id}`}
                      className="flex flex-1 items-center gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        <BookOpen className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <span className="font-medium">{lesson.title}</span>
                    </Link>
                    {/* Create Quiz button next to each lesson */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onCreateQuiz(lesson.id);
                      }}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      {tQuiz('createQuizButton')}
                    </Button>
                  </div>
                  {/* Quizzes for this lesson */}
                  {quizzesByLesson.get(lesson.id)?.map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/courses/${courseId}/quiz/${quiz.id}`}
                      className="group flex items-center justify-between border-t border-dashed bg-muted/20 py-3 pr-4 pl-16 transition-colors duration-300 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors duration-300 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-900/30 dark:text-violet-400 dark:group-hover:bg-violet-600">
                          <ClipboardList
                            className="h-3.5 w-3.5"
                            strokeWidth={2}
                          />
                        </div>
                        <div>
                          <span className="font-medium text-sm">
                            {quiz.title}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {QUESTION_SUB_TYPE_LABELS[quiz.subType]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {DELIVERY_MODE_LABELS[quiz.deliveryMode]}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {quiz.questionCount}{' '}
                              {quiz.questionCount === 1
                                ? 'question'
                                : 'questions'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}
