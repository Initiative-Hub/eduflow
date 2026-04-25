'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddLessonDialog } from '../_components/add-lesson-dialog';
import { ModuleAccordionItem } from '../_components/module-accordion-item';
import type { CreateLessonFormData } from '../create-lesson.config';
import { useModules } from '../use-modules';

interface CourseModulesClientProps {
  courseId: string;
}

export function CourseModulesClient({ courseId }: CourseModulesClientProps) {
  const t = useTranslations('Courses');

  const {
    modules,
    isLoading,
    isCreatingModule,
    handleCreateModule,
    isCreatingLesson,
    handleCreateLesson,
  } = useModules(courseId);

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<
    string | null
  >(null);

  const onCreateModule = () => {
    if (!newModuleTitle.trim()) return;
    handleCreateModule(
      { title: newModuleTitle.trim() },
      { onSuccess: () => setNewModuleTitle('') }
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

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="font-bold text-2xl text-foreground">
            {t('CourseModules.title')}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {t('CourseModules.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t('LessonOutline.Dialog.fields.titlePlaceholder')}
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            className="w-64 border-foreground/30 dark:border-border"
          />
          <Button onClick={onCreateModule} disabled={isCreatingModule}>
            <Plus className="mr-1 h-4 w-4" />
            {t('CourseModules.addModule')}
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
          {t('CourseModules.noModules')}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {modules.map((moduleItem) => (
            <ModuleAccordionItem
              key={moduleItem.id}
              moduleItem={moduleItem}
              courseId={courseId}
              onAddLesson={setActiveModuleIdForLesson}
            />
          ))}
        </Accordion>
      )}

      <AddLessonDialog
        isOpen={!!activeModuleIdForLesson}
        onOpenChange={(open) => !open && setActiveModuleIdForLesson(null)}
        onSubmit={onCreateLesson}
        isLoading={isCreatingLesson}
      />
    </div>
  );
}
