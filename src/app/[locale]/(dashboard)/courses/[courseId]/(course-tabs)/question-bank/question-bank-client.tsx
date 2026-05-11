'use client';

import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuestionBankEntry,
  type QuestionSubType,
} from '@/lib/quiz-template';
import { cn } from '@/lib/utils';
import { useModules } from '../../use-modules';
import {
  useQuestionBank,
  useQuestionBankFilters,
} from '../../use-question-bank';
import { QuestionPreview } from './question-preview';

interface QuestionBankClientProps {
  courseId: string;
}

export function QuestionBankClient({ courseId }: QuestionBankClientProps) {
  const t = useTranslations('Courses.QuestionBank');
  const { modules } = useModules(courseId);
  const { questions, isLoadingQuestions, deleteQuestion, isDeletingQuestion } =
    useQuestionBank({ courseId });
  const {
    filteredQuestions,
    categoryFilters,
    subTypeFilters,
    toggleSubType,
    lessonFilters,
    toggleLesson,
    includeNoLesson,
    setIncludeNoLesson,
    hasActiveFilters,
    resetFilters,
  } = useQuestionBankFilters(questions);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] =
    useState<QuestionBankEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allLessons = modules.flatMap((m) => m.lessons);

  const getLessonTitle = (lessonId: string | null) => {
    if (!lessonId) return t('noLesson');
    const lesson = allLessons.find((l) => l.id === lessonId);
    return lesson?.title ?? t('unknownLesson');
  };

  const displayedQuestions = useMemo(() => {
    if (!searchQuery.trim()) return filteredQuestions;
    const query = searchQuery.toLowerCase();
    return filteredQuestions.filter((q) =>
      q.prompt.toLowerCase().includes(query)
    );
  }, [filteredQuestions, searchQuery]);

  const handleDelete = (questionId: string) => {
    deleteQuestion(questionId);
    setDeleteConfirmId(null);
  };

  // Counts for filter badges
  const typeFilterCount = categoryFilters.size + subTypeFilters.size;
  const moduleFilterCount = modules.filter((m) =>
    m.lessons.some((l) => lessonFilters.has(l.id))
  ).length;
  const lessonFilterCount = lessonFilters.size + (includeNoLesson ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quiz-demo" target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-4 w-4" />
              {t('previewTypes')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {/* Filter dropdowns row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Question Type dropdown (combines Category + Sub-Type) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-1.5',
                typeFilterCount > 0 &&
                  'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/20 dark:text-purple-300'
              )}
            >
              {typeFilterCount > 0
                ? t('filterTypeActive', { count: typeFilterCount })
                : t('filterType')}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              {/* Selection-Based section */}
              <div>
                <p className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {QUIZ_CATEGORIES['selection-based'].label}
                </p>
                <div className="space-y-1">
                  {QUIZ_CATEGORIES['selection-based'].subTypes.map((st) => (
                    <label
                      key={st}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={subTypeFilters.has(st as QuestionSubType)}
                        onCheckedChange={() =>
                          toggleSubType(st as QuestionSubType)
                        }
                      />
                      <span className="text-sm">
                        {QUESTION_SUB_TYPE_LABELS[st as QuestionSubType]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Open-Ended section */}
              <div>
                <p className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {QUIZ_CATEGORIES['open-ended'].label}
                </p>
                <div className="space-y-1">
                  {QUIZ_CATEGORIES['open-ended'].subTypes.map((st) => (
                    <label
                      key={st}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={subTypeFilters.has(st as QuestionSubType)}
                        onCheckedChange={() =>
                          toggleSubType(st as QuestionSubType)
                        }
                      />
                      <span className="text-sm">
                        {QUESTION_SUB_TYPE_LABELS[st as QuestionSubType]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Module dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-1.5',
                moduleFilterCount > 0 &&
                  'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/20 dark:text-purple-300'
              )}
            >
              {moduleFilterCount > 0
                ? t('filterModuleActive', { count: moduleFilterCount })
                : t('filterModule')}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3" align="start">
            <div className="space-y-1">
              {modules.map((mod) => {
                const modLessonIds = mod.lessons.map((l) => l.id);
                const allSelected = modLessonIds.every((id) =>
                  lessonFilters.has(id)
                );
                const someSelected =
                  !allSelected &&
                  modLessonIds.some((id) => lessonFilters.has(id));
                return (
                  <label
                    key={mod.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={
                        allSelected
                          ? true
                          : someSelected
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={() => {
                        for (const lessonId of modLessonIds) {
                          if (!allSelected && !lessonFilters.has(lessonId)) {
                            toggleLesson(lessonId);
                          } else if (
                            allSelected &&
                            lessonFilters.has(lessonId)
                          ) {
                            toggleLesson(lessonId);
                          }
                        }
                      }}
                    />
                    <span className="text-sm">{mod.title}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Lesson dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-1.5',
                lessonFilterCount > 0 &&
                  'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/20 dark:text-purple-300'
              )}
            >
              {lessonFilterCount > 0
                ? t('filterLessonActive', { count: lessonFilterCount })
                : t('filterLesson')}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="max-h-64 w-64 overflow-y-auto p-3"
            align="start"
          >
            <div className="space-y-1">
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                <Checkbox
                  checked={includeNoLesson}
                  onCheckedChange={(checked) =>
                    setIncludeNoLesson(checked === true)
                  }
                />
                <span className="text-sm italic">{t('noLessonFilter')}</span>
              </label>
              {allLessons.map((lesson) => (
                <label
                  key={lesson.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={lessonFilters.has(lesson.id)}
                    onCheckedChange={() => toggleLesson(lesson.id)}
                  />
                  <span className="text-sm">{lesson.title}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-muted-foreground text-xs hover:text-foreground"
            onClick={resetFilters}
          >
            <X className="h-3.5 w-3.5" />
            {t('clearFilters')}
          </Button>
        )}

        <span className="ml-auto text-muted-foreground text-xs">
          {t('questionCount', { count: displayedQuestions.length })}
        </span>
      </div>

      {/* Question List */}
      <div className="space-y-2">
        {isLoadingQuestions ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : displayedQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('noQuestions')}</p>
          </div>
        ) : (
          displayedQuestions.map((question) => (
            <button
              key={question.id}
              type="button"
              className="group flex w-full cursor-pointer items-start justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40"
              onClick={() => setPreviewQuestion(question)}
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium text-foreground text-sm">
                  {question.prompt}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {QUIZ_CATEGORIES[question.category].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {QUESTION_SUB_TYPE_LABELS[question.subType]}
                  </Badge>
                  {question.lessonId && (
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {getLessonTitle(question.lessonId)}
                    </Badge>
                  )}
                </div>
              </div>
              <div
                className="ml-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {deleteConfirmId === question.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDelete(question.id)}
                      disabled={isDeletingQuestion}
                    >
                      {t('confirmDelete')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteConfirmId(question.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Question Preview Dialog — large, shows correct answer immediately */}
      <Dialog
        open={!!previewQuestion}
        onOpenChange={(open) => !open && setPreviewQuestion(null)}
      >
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-8 py-5">
            <DialogTitle className="font-bold text-xl">
              {t('questionPreview')}
            </DialogTitle>
            {previewQuestion && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary">
                  {QUIZ_CATEGORIES[previewQuestion.category].label}
                </Badge>
                <Badge variant="outline">
                  {QUESTION_SUB_TYPE_LABELS[previewQuestion.subType]}
                </Badge>
                {previewQuestion.lessonId && (
                  <Badge variant="outline">
                    <BookOpen className="mr-1 h-3 w-3" />
                    {getLessonTitle(previewQuestion.lessonId)}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {previewQuestion && <QuestionPreview question={previewQuestion} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
