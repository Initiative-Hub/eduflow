// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useModulesMock = vi.fn();
const useQuestionBankMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/[locale]/(dashboard)/courses/[courseId]/use-modules', () => ({
  useModules: useModulesMock,
}));

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/use-question-bank',
  () => ({
    useQuestionBank: useQuestionBankMock,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/add-module-dialog',
  () => ({
    AddModuleDialog: ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div>AddModuleDialog</div> : null,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/add-lesson-dialog',
  () => ({
    AddLessonDialog: ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div>AddLessonDialog</div> : null,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/create-quiz-dialog',
  () => ({
    CreateQuizDialog: () => null,
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/_components/module-accordion-item',
  () => ({
    ModuleAccordionItem: ({
      canCreateContent,
      canDeleteContent,
      canEditContent,
    }: {
      canCreateContent: boolean;
      canDeleteContent: boolean;
      canEditContent: boolean;
    }) => (
      <div>
        module-row:{String(canCreateContent)}:{String(canEditContent)}:
        {String(canDeleteContent)}
      </div>
    ),
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/ai-client/ai-client-dialog',
  () => ({
    AiClientDialog: ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div>AiClientDialog</div> : null,
  })
);

describe('CourseModulesClient permissions', () => {
  it('hides create affordances when course content create is missing', async () => {
    useModulesMock.mockReturnValue({
      modules: [{ id: 'module-1', itemLayout: null, lessons: [], title: 'M1' }],
      isLoading: false,
      isCreatingModule: false,
      handleCreateModule: vi.fn(),
      isCreatingLesson: false,
      handleCreateLesson: vi.fn(),
      courseContentDraft: null,
      searchSources: [],
      generationStep: 'idle',
      generationError: null,
      isRunning: false,
      resetGeneration: vi.fn(),
      generateCourseContent: vi.fn(),
    });
    useQuestionBankMock.mockReturnValue({ quizzes: [], isCreatingQuiz: false });

    const { CourseModulesClient } = await import(
      '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/course-modules-client'
    );

    render(
      <CourseModulesClient
        courseId="course-1"
        canCreateContent={false}
        canDeleteContent={false}
        canEditContent={false}
        canUseCourseGenerationAI={true}
        canCreateQuiz={false}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'addModule' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'generateCourseContent',
      })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('module-row:false:false:false')
    ).toBeInTheDocument();
  });

  it('shows AI Assistant only when AI and content-create permissions are both present', async () => {
    useModulesMock.mockReturnValue({
      modules: [],
      isLoading: false,
      isCreatingModule: false,
      handleCreateModule: vi.fn(),
      isCreatingLesson: false,
      handleCreateLesson: vi.fn(),
      courseContentDraft: null,
      searchSources: [],
      generationStep: 'idle',
      generationError: null,
      isRunning: false,
      resetGeneration: vi.fn(),
      generateCourseContent: vi.fn(),
    });
    useQuestionBankMock.mockReturnValue({ quizzes: [], isCreatingQuiz: false });

    const { CourseModulesClient } = await import(
      '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/course-modules-client'
    );

    render(
      <CourseModulesClient
        courseId="course-1"
        canCreateContent={true}
        canDeleteContent={true}
        canEditContent={true}
        canUseCourseGenerationAI={true}
        canCreateQuiz={false}
      />
    );

    expect(
      screen.getByRole('button', {
        name: 'generateCourseContent',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'addModule' })
    ).toBeInTheDocument();
  });
});
