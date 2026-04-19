'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useModules } from '../use-modules';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { Plus } from 'lucide-react';
import { ModuleAccordionItem } from '../_components/module-accordion-item';
import { AddLessonDialog } from '../_components/add-lesson-dialog';
import type { CreateLessonFormData } from '../create-lesson.config';

export default function CourseModulesPage() {
  const params = useParams();
  const courseId = params.courseId as string;

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
      <div className="flex justify-between items-end pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Modules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your course syllabus and materials
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New Module Title..."
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            className="w-64 border-foreground/30 dark:border-border"
          />
          <Button onClick={onCreateModule} disabled={isCreatingModule}>
            <Plus className="w-4 h-4 mr-1" />
            Add Module
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-muted rounded-md w-full" />
          <div className="h-16 bg-muted rounded-md w-full" />
        </div>
      ) : modules.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-xl bg-card/50 text-muted-foreground">
          No modules found. Create one to get started!
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
