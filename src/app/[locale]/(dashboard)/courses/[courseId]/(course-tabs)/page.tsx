'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useModules } from '../use-modules';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookOpen, Plus } from 'lucide-react';
import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';

const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

const lessonFields = [
  {
    name: 'title',
    label: 'Lesson Title',
    type: 'text',
    placeholder: 'E.g., Introduction to the topic',
    required: true,
    colSpan: 2,
  },
];

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
      {
        onSuccess: () => setNewModuleTitle(''),
      }
    );
  };

  const onCreateLesson = (data: { title: string }) => {
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
            + Add Module
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
            <AccordionItem
              value={moduleItem.id}
              key={moduleItem.id}
              className="border bg-card rounded-md shadow-sm overflow-hidden"
            >
              <div className="relative group/module-row">
                <AccordionTrigger className="bg-muted/40 p-4 border-b font-medium flex justify-between items-center text-foreground hover:bg-muted/60 transition-colors">
                  <div className="flex justify-between items-center w-full pr-24">
                    <span className="text-lg">{moduleItem.title}</span>
                  </div>
                </AccordionTrigger>
                <div className="absolute right-12 top-[13px] z-10">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveModuleIdForLesson(moduleItem.id);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add lesson
                  </Button>
                </div>
                <AccordionContent className="bg-card text-sm p-0 m-0 border-none">
                  <div className="divide-y">
                    {moduleItem.lessons.length === 0 ? (
                      <div className="p-4 text-muted-foreground italic text-center">
                        No lessons in this module. Add one above.
                      </div>
                    ) : (
                      moduleItem.lessons.map((lesson) => (
                        <Link
                          key={lesson.id}
                          href={`/courses/${courseId}/lessons/${lesson.id}`}
                          className="group flex justify-between items-center p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <BookOpen className="w-4 h-4" strokeWidth={2} />
                            </div>
                            <span className="font-medium">{lesson.title}</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <DialogTemplate
        isOpen={!!activeModuleIdForLesson}
        onOpenChange={(open) => !open && setActiveModuleIdForLesson(null)}
        title="Add Lesson"
        description="Provide a title for the new lesson within this module."
      >
        <FormTemplate
          schema={createLessonSchema}
          defaultValues={{ title: '' }}
          fields={lessonFields as any}
          onSubmit={onCreateLesson}
          submitLabel="Create Lesson"
          isLoading={isCreatingLesson}
        />
      </DialogTemplate>
    </div>
  );
}
