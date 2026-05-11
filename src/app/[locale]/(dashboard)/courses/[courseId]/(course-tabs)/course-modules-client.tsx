'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AddLessonDialog } from '../_components/add-lesson-dialog';
import { AddModuleDialog } from '../_components/add-module-dialog';
import { ModuleAccordionItem } from '../_components/module-accordion-item';
import type { CreateLessonFormData } from '../create-lesson.config';
import type { CreateModuleFormData } from '../create-module.config';
import { useModules } from '../use-modules';
import { useQuestionBank } from '../use-question-bank';

interface CourseModulesClientProps {
  courseId: string;
}

export function CourseModulesClient({ courseId }: CourseModulesClientProps) {
  const t = useTranslations('Courses.CourseModules');
  const router = useRouter();

  const {
    modules,
    isLoading,
    isCreatingModule,
    handleCreateModule,
    isCreatingLesson,
    handleCreateLesson,
  } = useModules(courseId);

  const { quizzes } = useQuestionBank({ courseId });

  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<
    string | null
  >(null);

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

  const handleCreateQuiz = (lessonId: string) => {
    router.push(`/courses/${courseId}/create-quiz?lessonId=${lessonId}`);
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
          <Button onClick={() => setIsAddModuleOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('addModule')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-full rounded-md bg-muted" />
          <div className="h-16 w-full rounded-md bg-muted" />
        </div>
      ) : modules.length === 0 ? (
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
              onAddLesson={setActiveModuleIdForLesson}
              onCreateQuiz={handleCreateQuiz}
              quizzes={quizzes}
            />
          ))}
        </Accordion>
      )}

      <AddModuleDialog
        isOpen={isAddModuleOpen}
        onOpenChange={setIsAddModuleOpen}
        onSubmit={onCreateModule}
        isLoading={isCreatingModule}
      />

      <AddLessonDialog
        isOpen={!!activeModuleIdForLesson}
        onOpenChange={(open) => !open && setActiveModuleIdForLesson(null)}
        onSubmit={onCreateLesson}
        isLoading={isCreatingLesson}
      />
    </div>
  );
}
