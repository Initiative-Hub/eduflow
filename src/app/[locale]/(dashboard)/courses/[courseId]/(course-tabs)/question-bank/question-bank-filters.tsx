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
import { QUIZ_CATEGORIES, type QuestionSubType } from '@/lib/quiz-template';
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
  const activeFilterClassName = 'border-primary/30 bg-primary/10 text-primary';
  const filterPopoverClassName =
    'max-h-[min(24rem,var(--radix-popover-content-available-height))] overflow-hidden p-0';
  const filterScrollAreaClassName =
    'flex max-h-[inherit] flex-col gap-1 overflow-y-auto p-3';
  const filterOptionClassName =
    'flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 transition-colors hover:bg-primary/10 hover:text-primary';
  const filterCheckboxClassName = 'mt-0.5 shrink-0';
  const filterLabelClassName = 'min-w-0 break-words text-sm leading-snug';

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
              typeFilterCount > 0 && activeFilterClassName
            )}
          >
            {typeFilterCount > 0
              ? t('filterTypeActive', { count: typeFilterCount })
              : t('filterType')}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-64', filterPopoverClassName)}
          align="start"
          collisionPadding={16}
        >
          <div className="flex max-h-[inherit] flex-col gap-3 overflow-y-auto p-3">
            <div>
              <p className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {t('categories.SELECTION_BASED')}
              </p>
              <div className="flex flex-col gap-1">
                {QUIZ_CATEGORIES.SELECTION_BASED.subTypes.map((st) => (
                  <label key={st} className={filterOptionClassName}>
                    <Checkbox
                      className={filterCheckboxClassName}
                      checked={subTypeFilters.has(st)}
                      onCheckedChange={() => toggleSubType(st)}
                    />
                    <span className={filterLabelClassName}>
                      {t(`questionTypes.${st}`)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {t('categories.OPEN_ENDED')}
              </p>
              <div className="flex flex-col gap-1">
                {QUIZ_CATEGORIES.OPEN_ENDED.subTypes.map((st) => (
                  <label key={st} className={filterOptionClassName}>
                    <Checkbox
                      className={filterCheckboxClassName}
                      checked={subTypeFilters.has(st)}
                      onCheckedChange={() => toggleSubType(st)}
                    />
                    <span className={filterLabelClassName}>
                      {t(`questionTypes.${st}`)}
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
              moduleFilterCount > 0 && activeFilterClassName
            )}
          >
            {moduleFilterCount > 0
              ? t('filterModuleActive', { count: moduleFilterCount })
              : t('filterModule')}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-72', filterPopoverClassName)}
          align="start"
          collisionPadding={16}
        >
          <div className={filterScrollAreaClassName}>
            {modules.map((mod) => {
              const modLessonIds = mod.lessons.map((l) => l.id);
              const allSelected = modLessonIds.every((id) =>
                lessonFilters.has(id)
              );
              const someSelected =
                !allSelected &&
                modLessonIds.some((id) => lessonFilters.has(id));
              return (
                <label key={mod.id} className={filterOptionClassName}>
                  <Checkbox
                    className={filterCheckboxClassName}
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
                  <span className={filterLabelClassName}>{mod.title}</span>
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
              lessonFilterCount > 0 && activeFilterClassName
            )}
          >
            {lessonFilterCount > 0
              ? t('filterLessonActive', { count: lessonFilterCount })
              : t('filterLesson')}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-72', filterPopoverClassName)}
          align="start"
          collisionPadding={16}
        >
          <div className={filterScrollAreaClassName}>
            <label className={filterOptionClassName}>
              <Checkbox
                className={filterCheckboxClassName}
                checked={includeNoLesson}
                onCheckedChange={(checked) =>
                  setIncludeNoLesson(checked === true)
                }
              />
              <span className={cn(filterLabelClassName, 'italic')}>
                {t('noLessonFilter')}
              </span>
            </label>
            {allLessons.map((lesson) => (
              <label key={lesson.id} className={filterOptionClassName}>
                <Checkbox
                  className={filterCheckboxClassName}
                  checked={lessonFilters.has(lesson.id)}
                  onCheckedChange={() => toggleLesson(lesson.id)}
                />
                <span className={filterLabelClassName}>{lesson.title}</span>
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
