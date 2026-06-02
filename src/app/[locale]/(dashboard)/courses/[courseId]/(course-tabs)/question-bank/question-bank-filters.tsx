'use client';

import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  type QuestionSubType,
} from '@/lib/quiz-template';
import { cn } from '@/lib/utils';
import type { Module } from '../../use-modules';

interface QuestionBankFiltersProps {
  modules: Module[];
  categoryFilters: Set<string>;
  subTypeFilters: Set<QuestionSubType>;
  toggleSubType: (st: QuestionSubType) => void;
  lessonFilters: Set<string>;
  toggleLesson: (lessonId: string) => void;
  includeNoLesson: boolean;
  setIncludeNoLesson: (value: boolean) => void;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  questionCount: number;
}

export function QuestionBankFilters({
  modules,
  categoryFilters,
  subTypeFilters,
  toggleSubType,
  lessonFilters,
  toggleLesson,
  includeNoLesson,
  setIncludeNoLesson,
  hasActiveFilters,
  resetFilters,
  questionCount,
}: QuestionBankFiltersProps) {
  const t = useTranslations('Courses.QuestionBank');

  const allLessons = modules.flatMap((m) => m.lessons);
  const typeFilterCount = categoryFilters.size + subTypeFilters.size;
  const moduleFilterCount = modules.filter((m) =>
    m.lessons.some((l) => lessonFilters.has(l.id))
  ).length;
  const lessonFilterCount = lessonFilters.size + (includeNoLesson ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Question Type dropdown */}
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
            <div>
              <p className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {QUIZ_CATEGORIES['SELECTION_BASED'].label}
              </p>
              <div className="space-y-1">
                {QUIZ_CATEGORIES['SELECTION_BASED'].subTypes.map((st) => (
                  <label
                    key={st}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={subTypeFilters.has(st)}
                      onCheckedChange={() => toggleSubType(st)}
                    />
                    <span className="text-sm">
                      {QUESTION_SUB_TYPE_LABELS[st]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {QUIZ_CATEGORIES['OPEN_ENDED'].label}
              </p>
              <div className="space-y-1">
                {QUIZ_CATEGORIES['OPEN_ENDED'].subTypes.map((st) => (
                  <label
                    key={st}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={subTypeFilters.has(st)}
                      onCheckedChange={() => toggleSubType(st)}
                    />
                    <span className="text-sm">
                      {QUESTION_SUB_TYPE_LABELS[st]}
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
                        } else if (allSelected && lessonFilters.has(lessonId)) {
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
        {t('questionCount', { count: questionCount })}
      </span>
    </div>
  );
}
