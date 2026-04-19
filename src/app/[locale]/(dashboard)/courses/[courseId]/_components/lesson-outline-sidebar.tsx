'use client';

import { useRouter } from 'next/navigation';
import { useModules } from '../use-modules';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import { useDialog } from '@/components/custom/dialog/use-dialog';
import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';
import { cn } from '@/lib/utils';
import { ModuleLessonList } from './module-lesson-list';

const createModuleSchema = z.object({
  title: z.string().min(1, 'Module Title is required'),
});

const createModuleFields: FormFieldConfig[] = [
  {
    name: 'title',
    label: 'Module Title',
    type: 'text',
    placeholder: 'E.g., Getting Started',
    required: true,
    colSpan: 2,
  },
];

interface LessonOutlineSidebarProps {
  courseId: string;
  activeLessonId?: string;
  onSelectLesson?: (id: string) => void;
  className?: string;
}

export function LessonOutlineSidebar({
  courseId,
  activeLessonId,
  onSelectLesson,
  className,
}: LessonOutlineSidebarProps) {
  const router = useRouter();
  const { modules, isLoading, isCreatingModule, handleCreateModule } =
    useModules(courseId);
  const dialog = useDialog();

  const onCreateSubmit = (data: { title: string }) => {
    handleCreateModule(data, { onSuccess: () => dialog.close() });
  };

  const handleSelectLesson = (lessonId: string) => {
    if (onSelectLesson) {
      onSelectLesson(lessonId);
    } else {
      router.push(`/courses/${courseId}/lessons/${lessonId}`);
    }
  };

  return (
    <div
      className={cn(
        'w-80 border-l bg-card/30 flex flex-col h-full transition-all duration-300',
        className
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg">Contents</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dialog.open()}
            title="Add module"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground flex flex-col items-center">
            <BookOpen className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No modules yet.</p>
            <Button variant="link" onClick={() => dialog.open()}>
              Add your first module
            </Button>
          </div>
        ) : (
          <ModuleLessonList
            modules={modules}
            activeLessonId={activeLessonId}
            onSelectLesson={handleSelectLesson}
          />
        )}
      </div>

      <DialogTemplate
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        title="Add Module"
        description="Create a new module to organize your lessons."
      >
        <FormTemplate
          schema={createModuleSchema}
          defaultValues={{ title: '' }}
          fields={createModuleFields}
          onSubmit={onCreateSubmit}
          submitLabel="Create Module"
          isLoading={isCreatingModule}
        />
      </DialogTemplate>
    </div>
  );
}
