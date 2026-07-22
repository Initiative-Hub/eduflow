// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Accordion } from '@/components/ui/accordion';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PointerSensor: function PointerSensor() {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  arrayMove: vi.fn((items) => items),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: {},
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
    DeleteModuleDialog: () => <div>Delete Module</div>,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/_components/delete-lesson-dialog',
  () => ({
    default: () => <div>Delete Lesson</div>,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/use-module-order-mutations',
  () => ({
    useModuleOrderMutations: () => ({
      reorderMutation: { mutate: vi.fn() },
      indentMutation: { mutate: vi.fn() },
    }),
  })
);

vi.mock('@/components/custom/dropdown/dropdown', () => ({
  DropdownTemplate: ({
    trigger,
    items,
  }: {
    trigger: ReactNode;
    items: Array<{ label: string }>;
  }) => (
    <div>
      <div>dropdown-present</div>
      <div>{trigger}</div>
      <div>{items.map((item) => item.label).join('|')}</div>
    </div>
  ),
}));

describe('ModuleAccordionItem permissions', () => {
  it('hides delete, indent, and drag controls when permissions are missing', async () => {
    const { ModuleAccordionItem } = await import(
      '@/app/[locale]/(dashboard)/courses/[courseId]/_components/module-accordion-item'
    );

    render(
      <Accordion type="multiple">
        <ModuleAccordionItem
          moduleItem={{
            id: 'module-1',
            courseId: 'course-1',
            title: 'Module 1',
            orderIndex: 0,
            itemLayout: null,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Lesson 1',
                orderIndex: 0,
                content: { type: 'doc', content: [] },
              },
            ],
          }}
          courseId="course-1"
          canCreateContent={false}
          canDeleteContent={false}
          canEditContent={false}
          canCreateQuiz={false}
          onAddLesson={vi.fn()}
          onCreateQuiz={vi.fn()}
          quizzes={[]}
        />
      </Accordion>
    );

    expect(screen.queryByText('Delete Module')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete Lesson')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Courses.ModuleAccordion.addLesson')
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle('Indent')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Outdent')).not.toBeInTheDocument();
    expect(screen.queryByText('dropdown-present')).not.toBeInTheDocument();
  });

  it('keeps the shared plus trigger for quiz creation while removing Add lesson without create-content permission', async () => {
    const { ModuleAccordionItem } = await import(
      '@/app/[locale]/(dashboard)/courses/[courseId]/_components/module-accordion-item'
    );

    render(
      <Accordion type="multiple">
        <ModuleAccordionItem
          moduleItem={{
            id: 'module-1',
            courseId: 'course-1',
            title: 'Module 1',
            orderIndex: 0,
            itemLayout: null,
            lessons: [],
          }}
          courseId="course-1"
          canCreateContent={false}
          canDeleteContent={true}
          canEditContent={true}
          canCreateQuiz={true}
          onAddLesson={vi.fn()}
          onCreateQuiz={vi.fn()}
          quizzes={[]}
        />
      </Accordion>
    );

    expect(
      screen.queryByText('Courses.ModuleAccordion.addLesson')
    ).not.toBeInTheDocument();
    expect(screen.getByText('addQuiz')).toBeInTheDocument();
    expect(screen.getByText('dropdown-present')).toBeInTheDocument();
  });
});
