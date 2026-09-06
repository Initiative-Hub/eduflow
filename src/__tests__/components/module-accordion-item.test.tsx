import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleAccordionItem } from '@/app/[locale]/(dashboard)/courses/[courseId]/_components/module-accordion-item';
import type { Module } from '@/app/[locale]/(dashboard)/courses/[courseId]/use-modules';
import { Accordion } from '@/components/ui/accordion';
import type { QuizDefinition } from '@/lib/quiz-template';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: unknown[], oldIndex: number, newIndex: number) => {
    const next = items.slice();
    const [item] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, item);
    return next;
  },
  SortableContext: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  useSortable: () => ({
    attributes: {},
    isDragging: false,
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/delete-module-dialog',
  () => ({
    DeleteModuleDialog: () => null,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/_components/delete-lesson-dialog',
  () => ({
    default: () => null,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/use-module-order-mutations',
  () => ({
    useModuleOrderMutations: () => ({
      indentMutation: { mutate: vi.fn() },
      reorderMutation: { mutate: vi.fn() },
    }),
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/delete-quiz-dialog',
  () => ({
    DeleteQuizDialog: ({
      onDeleted,
      quizId,
      quizTitle,
    }: {
      onDeleted?: (quizId: string) => void;
      quizId: string;
      quizTitle: string;
    }) => (
      <button type="button" onClick={() => onDeleted?.(quizId)}>
        Delete {quizTitle}
      </button>
    ),
  })
);

const moduleItem: Module = {
  courseId: 'course-1',
  id: 'module-1',
  itemLayout: null,
  lessons: [
    {
      content: { type: 'doc', content: [] },
      id: 'lesson-1',
      orderIndex: 0,
      title: 'Lesson one',
    },
  ],
  orderIndex: 0,
  title: 'Module one',
};

const staleQuiz: QuizDefinition = {
  courseId: 'course-1',
  createdAt: '2026-07-13T00:00:00.000Z',
  deliveryMode: 'POST_QUIZ_REVIEW',
  description: '',
  id: 'quiz-1',
  lessonIds: ['lesson-1'],
  questionCount: 3,
  questionCounts: {},
  questions: [],
  selectionMethod: 'MANUAL_CREATE',
  title: 'Chapter 2',
  updatedAt: '2026-07-13T00:00:00.000Z',
};

describe('ModuleAccordionItem', () => {
  it('hides a deleted quiz row immediately even when quiz props are stale', async () => {
    const user = userEvent.setup();

    render(
      <Accordion type="multiple" defaultValue={['module-1']}>
        <ModuleAccordionItem
          canCreateContent={false}
          canDeleteContent
          canEditContent={false}
          canCreateQuiz={false}
          courseId="course-1"
          moduleItem={moduleItem}
          onAddLesson={vi.fn()}
          onCreateQuiz={vi.fn()}
          quizzes={[staleQuiz]}
        />
      </Accordion>
    );

    expect(screen.getByText('Chapter 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Chapter 2' }));

    expect(screen.queryByText('Chapter 2')).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="accordion-content"] > div')
    ).toHaveClass('h-auto');
  });
});
