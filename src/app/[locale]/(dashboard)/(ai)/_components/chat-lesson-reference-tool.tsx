'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronLeft, Loader2, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';

type PickerCourse = {
  id: string;
  title: string;
  description: string | null;
};

type LessonReferenceModule = {
  id: string;
  title: string;
  lessons: Array<{
    id: string;
    title: string;
  }>;
};

export type ChatLessonReferenceToolProps = {
  disabled: boolean;
  disabledLessonIds: string[];
  maxSelectable: number;
  onAttach: (lessons: ChatLessonReferenceUIPart[]) => void;
};

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}

function CourseTile({
  course,
  onSelect,
}: {
  course: PickerCourse;
  onSelect: (course: PickerCourse) => void;
}) {
  return (
    <Button
      className="flex h-28 w-full cursor-pointer flex-col items-start justify-between rounded-lg border bg-background p-3 text-left hover:bg-muted/50"
      onClick={() => onSelect(course)}
      type="button"
      variant="ghost"
    >
      <BookOpen className="size-5 text-muted-foreground" />
      <span className="line-clamp-2 w-full whitespace-normal font-medium text-sm">
        {course.title}
      </span>
      {course.description ? (
        <span className="line-clamp-1 w-full whitespace-normal text-muted-foreground text-xs">
          {course.description}
        </span>
      ) : null}
    </Button>
  );
}

export function ChatLessonReferenceTool({
  disabled,
  disabledLessonIds,
  maxSelectable,
  onAttach,
}: ChatLessonReferenceToolProps) {
  const t = useTranslations('AIChat.lessonReferencePicker');
  const [open, setOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<PickerCourse | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [selectedLessons, setSelectedLessons] = useState<
    Record<string, ChatLessonReferenceUIPart>
  >({});
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const disabledLessonIdSet = useMemo(
    () => new Set(disabledLessonIds),
    [disabledLessonIds]
  );
  const selectedCount = Object.keys(selectedLessons).length;

  const coursesQuery = useQuery({
    queryKey: ['chat-lesson-reference-picker', 'joined-courses'],
    queryFn: () => apiClient.get<PickerCourse[]>('v1/courses/joined'),
    enabled: open && !selectedCourse,
  });

  const modulesQuery = useQuery({
    queryKey: ['chat-lesson-reference-picker', selectedCourse?.id ?? 'none'],
    queryFn: () =>
      apiClient.get<LessonReferenceModule[]>(
        `v1/courses/${selectedCourse?.id}/lesson-references`
      ),
    enabled: open && Boolean(selectedCourse),
    placeholderData: keepPreviousData,
  });

  const modules = useMemo(() => {
    const data = modulesQuery.data ?? [];
    if (!deferredSearch) return data;

    return data
      .map((moduleItem) => ({
        ...moduleItem,
        lessons: moduleItem.lessons.filter((lesson) =>
          `${moduleItem.title} ${lesson.title}`
            .toLowerCase()
            .includes(deferredSearch)
        ),
      }))
      .filter((moduleItem) => moduleItem.lessons.length > 0);
  }, [deferredSearch, modulesQuery.data]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedCourse(null);
      setSearch('');
      setSelectedLessons({});
    }
    setOpen(nextOpen);
  };

  const handleToggle = (
    moduleItem: LessonReferenceModule,
    lesson: LessonReferenceModule['lessons'][number]
  ) => {
    if (!selectedCourse || disabledLessonIdSet.has(lesson.id)) return;

    setSelectedLessons((current) => {
      if (current[lesson.id]) {
        const next = { ...current };
        delete next[lesson.id];
        return next;
      }

      if (Object.keys(current).length >= maxSelectable) {
        toast.error(t('tooMany'));
        return current;
      }

      return {
        ...current,
        [lesson.id]: {
          type: 'data-lesson-reference',
          id: lesson.id,
          data: {
            courseId: selectedCourse.id,
            courseTitle: selectedCourse.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            moduleTitle: moduleItem.title,
          },
        },
      };
    });
  };

  const attachSelectedLessons = () => {
    const lessons = Object.values(selectedLessons);
    if (lessons.length === 0) return;

    onAttach(lessons);
    handleOpenChange(false);
  };

  return (
    <>
      <Button
        aria-label={t('open')}
        className="h-9 gap-1.5 rounded-full px-3"
        disabled={disabled}
        onClick={() => {
          if (maxSelectable === 0) {
            toast.error(t('tooMany'));
            return;
          }
          setOpen(true);
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        <BookOpen className="size-4" />
        <span className="hidden text-xs sm:inline">{t('trigger')}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-hidden sm:max-w-3xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 px-5">
            {!selectedCourse ? (
              <div className="py-3">
                {coursesQuery.isLoading ? (
                  <GridSkeleton />
                ) : coursesQuery.data?.length ? (
                  <ScrollArea className="h-105 pr-3">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {coursesQuery.data.map((course) => (
                        <CourseTile
                          key={course.id}
                          course={course}
                          onSelect={setSelectedCourse}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{t('emptyCoursesTitle')}</EmptyTitle>
                      <EmptyDescription>
                        {t('emptyCoursesDescription')}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            ) : (
              <div className="flex min-h-0 flex-col gap-3 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Button
                    onClick={() => {
                      setSelectedCourse(null);
                      setSearch('');
                      setSelectedLessons({});
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeft data-icon="inline-start" />
                    {t('backToCourses')}
                  </Button>
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t('searchPlaceholder')}
                      value={search}
                    />
                  </div>
                  <Badge variant="secondary">
                    {t('selectedCount', {
                      count: selectedCount,
                      max: maxSelectable,
                    })}
                  </Badge>
                </div>

                <ScrollArea className="h-105 pr-3">
                  {modulesQuery.isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  ) : modules.length > 0 ? (
                    <Accordion
                      className="gap-1"
                      collapsible
                      defaultValue={modules.at(0)?.id}
                      type="single"
                    >
                      {modules.map((moduleItem) => (
                        <AccordionItem
                          key={moduleItem.id}
                          value={moduleItem.id}
                        >
                          <AccordionTrigger className="px-2">
                            <span className="truncate">{moduleItem.title}</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1">
                              {moduleItem.lessons.map((lesson) => {
                                const checked = Boolean(
                                  selectedLessons[lesson.id]
                                );
                                const alreadyAttached = disabledLessonIdSet.has(
                                  lesson.id
                                );
                                const disabledLesson =
                                  alreadyAttached ||
                                  (!checked && selectedCount >= maxSelectable);

                                return (
                                  <div
                                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60 has-disabled:cursor-not-allowed has-disabled:opacity-60"
                                    key={lesson.id}
                                  >
                                    <Checkbox
                                      aria-label={t('selectLesson', {
                                        name: lesson.title,
                                      })}
                                      checked={checked || alreadyAttached}
                                      disabled={disabledLesson}
                                      onCheckedChange={() =>
                                        handleToggle(moduleItem, lesson)
                                      }
                                    />
                                    <button
                                      className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                                      disabled={disabledLesson}
                                      onClick={() =>
                                        handleToggle(moduleItem, lesson)
                                      }
                                      type="button"
                                    >
                                      <div className="truncate font-medium text-sm">
                                        {lesson.title}
                                      </div>
                                      {alreadyAttached ? (
                                        <div className="text-muted-foreground text-xs">
                                          {t('alreadyAttached')}
                                        </div>
                                      ) : null}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>{t('emptyLessonsTitle')}</EmptyTitle>
                        <EmptyDescription>
                          {t('emptyLessonsDescription')}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t('cancel')}
            </Button>
            <Button
              disabled={!selectedCourse || selectedCount === 0}
              onClick={attachSelectedLessons}
              type="button"
            >
              {modulesQuery.isFetching ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              {t('attach', { count: selectedCount })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
