'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookOpen,
  ClipboardList,
  GripVertical,
  Indent,
  Outdent,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { DropdownTemplate } from '@/components/custom/dropdown/dropdown';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { QuizDefinition } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';
import DeleteLessonDialog from '../lessons/[lessonId]/_components/delete-lesson-dialog';
import type { Module } from '../use-modules';
import { DeleteModuleDialog } from './delete-module-dialog';
import { DeleteQuizDialog } from './delete-quiz-dialog';
import { useModuleOrderMutations } from './use-module-order-mutations';

// Unified item type for flat list rendering
export type AccordionListItem =
  | { kind: 'lesson'; id: string; title: string; indent: number }
  | {
      kind: 'quiz';
      id: string;
      title: string;
      questionCount: number;
      indent: number;
    };

interface ModuleAccordionItemProps {
  moduleItem: Module;
  courseId: string;
  canCreateContent: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canCreateQuiz: boolean;
  /** Called with the module ID when the user clicks "Add lesson" */
  onAddLesson: (moduleId: string) => void;
  /** Called with the module ID when the user clicks "Create Quiz" from the dropdown */
  onCreateQuiz: (moduleId: string) => void;
  /** Quizzes associated with lessons in this module */
  quizzes?: QuizDefinition[];
}

/**
 * Builds a flat item list from lessons and quizzes, applying saved order and indent levels.
 */
function buildItemList(
  lessons: Module['lessons'],
  moduleQuizzes: QuizDefinition[],
  savedOrder: Map<string, number> | null,
  savedIndents: Map<string, number>
): AccordionListItem[] {
  const list: AccordionListItem[] = [];

  for (const lesson of lessons) {
    list.push({
      kind: 'lesson',
      id: lesson.id,
      title: lesson.title,
      indent: savedIndents.get(lesson.id) ?? 0,
    });
  }

  for (const quiz of moduleQuizzes) {
    list.push({
      kind: 'quiz',
      id: quiz.id,
      title: quiz.title,
      questionCount: quiz.questionCount,
      indent: savedIndents.get(quiz.id) ?? 0,
    });
  }

  // Apply saved order if available
  if (savedOrder && savedOrder.size > 0) {
    list.sort((a, b) => {
      const orderA = savedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = savedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }

  return list;
}

export function ModuleAccordionItem({
  moduleItem,
  courseId,
  canCreateContent,
  canEditContent,
  canDeleteContent,
  canCreateQuiz,
  onAddLesson,
  onCreateQuiz,
  quizzes = [],
}: ModuleAccordionItemProps) {
  const tAccordion = useTranslations('Courses.ModuleAccordion');
  const [deletedQuizIds, setDeletedQuizIds] = useState<Set<string>>(
    () => new Set()
  );

  const moduleQuizzes = useMemo(() => {
    const moduleLessonIds = new Set(moduleItem.lessons.map((l) => l.id));

    return quizzes.filter((quiz) => {
      if (deletedQuizIds.has(quiz.id)) return false;

      const linkedLessonIds = quiz.lessonIds;

      return linkedLessonIds.some((lessonId) => moduleLessonIds.has(lessonId));
    });
  }, [deletedQuizIds, moduleItem.lessons, quizzes]);

  const [localOrder, setLocalOrder] = useState<Map<string, number> | null>(
    () => {
      if (!moduleItem.itemLayout) return null;
      const map = new Map<string, number>();
      for (const entry of moduleItem.itemLayout) {
        map.set(entry.id, entry.orderIndex);
      }
      return map;
    }
  );
  const [localIndents, setLocalIndents] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (moduleItem.itemLayout) {
      for (const entry of moduleItem.itemLayout) {
        map.set(entry.id, entry.indent);
      }
    }
    return map;
  });

  // Derive items from props using useMemo — no manual sync needed
  const items = useMemo(
    () =>
      buildItemList(
        moduleItem.lessons,
        moduleQuizzes,
        localOrder,
        localIndents
      ),
    [moduleItem.lessons, moduleQuizzes, localOrder, localIndents]
  );

  // TanStack mutations for persisting reorder/indent
  const { reorderMutation, indentMutation } = useModuleOrderMutations(
    moduleItem.id,
    courseId
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const moduleActions = useMemo(() => {
    const actions = [];

    if (canCreateContent) {
      actions.push({
        label: tAccordion('addLesson'),
        icon: <BookOpen className="h-4 w-4" />,
        onClick: () => onAddLesson(moduleItem.id),
      });
    }

    if (canCreateQuiz) {
      actions.push({
        label: tAccordion('addQuiz'),
        icon: <ClipboardList className="h-4 w-4" />,
        onClick: () => onCreateQuiz(moduleItem.id),
      });
    }

    return actions;
  }, [
    canCreateContent,
    canCreateQuiz,
    moduleItem.id,
    onAddLesson,
    onCreateQuiz,
    tAccordion,
  ]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canEditContent) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);

      // Optimistic update: save new order locally
      const newOrderMap = new Map<string, number>();
      reordered.forEach((item, index) => {
        newOrderMap.set(item.id, index);
      });
      setLocalOrder(newOrderMap);

      // Persist via API
      reorderMutation.mutate({
        items: reordered.map((item, index) => ({
          id: item.id,
          orderIndex: index,
        })),
      });
    },
    [canEditContent, items, reorderMutation]
  );

  const handleIndent = useCallback(
    (id: string) => {
      if (!canEditContent) return;
      const currentItem = items.find((i) => i.id === id);
      if (!currentItem || currentItem.indent >= 2) return;

      const newIndent = currentItem.indent + 1;
      setLocalIndents((prev) => {
        const next = new Map(prev);
        next.set(id, newIndent);
        return next;
      });

      // Persist via API
      indentMutation.mutate({ itemId: id, indent: newIndent });
    },
    [canEditContent, items, indentMutation]
  );

  const handleOutdent = useCallback(
    (id: string) => {
      if (!canEditContent) return;
      const currentItem = items.find((i) => i.id === id);
      if (!currentItem || currentItem.indent <= 0) return;

      const newIndent = currentItem.indent - 1;
      setLocalIndents((prev) => {
        const next = new Map(prev);
        next.set(id, newIndent);
        return next;
      });

      // Persist via API
      indentMutation.mutate({ itemId: id, indent: newIndent });
    },
    [canEditContent, items, indentMutation]
  );

  const handleQuizDeleted = useCallback((quizId: string) => {
    setDeletedQuizIds((current) => {
      const next = new Set(current);
      next.add(quizId);
      return next;
    });
  }, []);

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
        <div className="absolute top-3.25 right-12 z-10 flex items-center gap-1.5">
          {canDeleteContent ? (
            <DeleteModuleDialog
              courseId={courseId}
              lessonCount={moduleItem.lessons.length}
              moduleId={moduleItem.id}
              moduleTitle={moduleItem.title}
            />
          ) : null}

          {moduleActions.length > 0 ? (
            <DropdownTemplate
              trigger={
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              }
              items={moduleActions}
            />
          ) : null}
        </div>

        <AccordionContent className="m-0 h-auto border-none bg-card p-0 text-sm">
          <div className="divide-y">
            {items.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground italic">
                {tAccordion('noLessons')}
              </div>
            ) : canEditContent ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={itemIds}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <SortableAccordionRow
                      key={item.id}
                      item={item}
                      courseId={courseId}
                      canDeleteContent={canDeleteContent}
                      canEditContent={canEditContent}
                      onIndent={handleIndent}
                      onOutdent={handleOutdent}
                      onQuizDeleted={handleQuizDeleted}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              items.map((item) => (
                <SortableAccordionRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  canDeleteContent={canDeleteContent}
                  canEditContent={canEditContent}
                  onIndent={handleIndent}
                  onOutdent={handleOutdent}
                  onQuizDeleted={handleQuizDeleted}
                />
              ))
            )}
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}

// ─── Sortable Row ────────────────────────────────────────────────────────────

interface SortableAccordionRowProps {
  item: AccordionListItem;
  courseId: string;
  canDeleteContent: boolean;
  canEditContent: boolean;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onQuizDeleted: (id: string) => void;
}

function SortableAccordionRow({
  item,
  courseId,
  canDeleteContent,
  canEditContent,
  onIndent,
  onOutdent,
  onQuizDeleted,
}: SortableAccordionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const indentPadding = item.indent * 24;

  if (item.kind === 'lesson') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group flex items-center justify-between p-4 transition-colors duration-300 hover:bg-muted/50',
          isDragging && 'z-50 bg-card opacity-90 shadow-md'
        )}
      >
        <Link
          href={`/courses/${courseId}/lessons/${item.id}`}
          className="flex flex-1 items-center gap-3"
          style={{ paddingLeft: `${indentPadding}px` }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
            <BookOpen className="h-4 w-4" strokeWidth={2} />
          </div>
          <span className="font-medium">{item.title}</span>
        </Link>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {canDeleteContent && (
            <DeleteLessonDialog
              courseId={courseId}
              lessonId={item.id}
              compact
              navigateAfterDelete={false}
            />
          )}
          {canEditContent && (
            <>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                onClick={() => onOutdent(item.id)}
                disabled={item.indent === 0}
                title="Outdent"
              >
                <Outdent className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                onClick={() => onIndent(item.id)}
                disabled={item.indent >= 2}
                title="Indent"
              >
                <Indent className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Quiz row
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center justify-between p-4 transition-colors duration-300 hover:bg-muted/50',
        isDragging && 'z-50 bg-card opacity-90 shadow-md'
      )}
    >
      <Link
        href={`/courses/${courseId}/quiz/${item.id}`}
        className="flex flex-1 items-center gap-3"
        style={{ paddingLeft: `${indentPadding}px` }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors duration-300 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-900/30 dark:text-violet-400 dark:group-hover:bg-violet-600">
          <ClipboardList className="h-4 w-4" strokeWidth={2} />
        </div>
        <div>
          <span className="font-medium text-sm">{item.title}</span>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {item.questionCount}{' '}
              {item.questionCount === 1 ? 'question' : 'questions'}
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {canDeleteContent && (
          <DeleteQuizDialog
            courseId={courseId}
            onDeleted={onQuizDeleted}
            quizId={item.id}
            quizTitle={item.title}
          />
        )}
        {canEditContent && (
          <>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              onClick={() => onOutdent(item.id)}
              disabled={item.indent === 0}
              title="Outdent"
            >
              <Outdent className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
              onClick={() => onIndent(item.id)}
              disabled={item.indent >= 2}
              title="Indent"
            >
              <Indent className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
