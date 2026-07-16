'use client';

import { Plus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AddLessonDialog } from '../_components/add-lesson-dialog';
import { AddModuleDialog } from '../_components/add-module-dialog';
import { CreateQuizDialog } from '../_components/create-quiz-dialog';
import { ModuleAccordionItem } from '../_components/module-accordion-item';
import type { CreateLessonFormData } from '../create-lesson.config';
import type { CreateModuleFormData } from '../create-module.config';
import { useModules } from '../use-modules';
import { useQuestionBank } from '../use-question-bank';
import { AiClientDialog } from './ai-client/ai-client-dialog';

interface CourseModulesClientProps {
  courseId: string;
  canCreateContent: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canUseCourseGenerationAI: boolean;
  canCreateQuiz: boolean;
}

export function CourseModulesClient({
  courseId,
  canCreateContent,
  canEditContent,
  canDeleteContent,
  canUseCourseGenerationAI,
  canCreateQuiz,
}: CourseModulesClientProps) {
  const t = useTranslations('Courses.CourseModules');

  const {
    modules,
    isLoading,
    isCreatingModule,
    handleCreateModule,
    isCreatingLesson,
    handleCreateLesson,
    streamingCourse,
    searchSources,
    generationStep,
    generationError,
    isRunning,
    resetGeneration,
    generateCourseModules,
  } = useModules(courseId);

  const { quizzes, isCreatingQuiz } = useQuestionBank({ courseId });

  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<
    string | null
  >(null);
  const [createQuizModuleId, setCreateQuizModuleId] = useState<string | null>(
    null
  );

  const onCreateModule = (data: CreateModuleFormData) => {
    handleCreateModule(
      { title: data.title },
      { onSuccess: () => setIsAddModuleOpen(false) }
    );
  };

  const onCreateLesson = (data: CreateLessonFormData) => {
    if (activeModuleIdForLesson) {
      handleCreateLesson(
        { moduleId: activeModuleIdForLesson, title: data.title },
        { onSuccess: () => setActiveModuleIdForLesson(null) }
      );
    }
  };

  const handleCreateQuiz = (moduleId: string) => {
    if (isCreatingQuiz) return;
    setCreateQuizModuleId(moduleId);
  };

  const onAiSelect = async (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => {
    await generateCourseModules(selection);
  };

  const onAiRetry = (selection: {
    fileId?: string;
    file?: File;
    context?: string;
  }) => {
    resetGeneration();
    generateCourseModules(selection);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateContent && canUseCourseGenerationAI ? (
            <Button
              variant="outline"
              className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsAiOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              {t('aiAssistant')}
            </Button>
          ) : null}
          {canCreateContent ? (
            <Button onClick={() => setIsAddModuleOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              {t('addModule')}
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-full rounded-md bg-muted" />
          <div className="h-16 w-full rounded-md bg-muted" />
        </div>
      ) : modules.length === 0 && !isRunning ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center text-muted-foreground">
          {t('noModules')}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {modules.map((moduleItem) => (
            <ModuleAccordionItem
              key={moduleItem.id}
              moduleItem={moduleItem}
              courseId={courseId}
              canCreateContent={canCreateContent}
              canEditContent={canEditContent}
              canDeleteContent={canDeleteContent}
              canCreateQuiz={canCreateQuiz}
              onAddLesson={setActiveModuleIdForLesson}
              onCreateQuiz={handleCreateQuiz}
              quizzes={quizzes}
            />
          ))}
        </Accordion>
      )}

      {canCreateContent ? (
        <AddModuleDialog
          isOpen={isAddModuleOpen}
          onOpenChange={setIsAddModuleOpen}
          onSubmit={onCreateModule}
          isLoading={isCreatingModule}
        />
      ) : null}

      {canCreateContent ? (
        <AddLessonDialog
          isOpen={!!activeModuleIdForLesson}
          onOpenChange={(open) => !open && setActiveModuleIdForLesson(null)}
          onSubmit={onCreateLesson}
          isLoading={isCreatingLesson}
        />
      ) : null}

      {canCreateContent && canUseCourseGenerationAI ? (
        <AiClientDialog
          isOpen={isAiOpen}
          onOpenChange={setIsAiOpen}
          onSelect={onAiSelect}
          onRetry={onAiRetry}
          generationStep={generationStep}
          generationError={generationError}
          isRunning={isRunning}
          streamingCourse={streamingCourse}
          searchSources={searchSources}
        />
      ) : null}

      {canCreateQuiz ? (
        <CreateQuizDialog
          isOpen={!!createQuizModuleId}
          onOpenChange={(open) => !open && setCreateQuizModuleId(null)}
          courseId={courseId}
          preselectedModuleId={createQuizModuleId ?? undefined}
          moduleName={
            modules.find((m) => m.id === createQuizModuleId)?.title ?? ''
          }
        />
      ) : null}
    </div>
  );
}
