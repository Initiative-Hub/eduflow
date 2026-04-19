'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModules } from '../use-modules';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Plus,
  BookOpen,
  FileText,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useDialog } from '@/components/custom/dialog/use-dialog';
import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const createModuleSchema = z.object({
  title: z.string().min(1, 'Module Title is required'),
});

const createModuleFields = [
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
  className?: string; // Add className prop here to fix the typescript error
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onCreateSubmit = (data: { title: string }) => {
    handleCreateModule(data, {
      onSuccess: () => dialog.close(),
    });
  };

  const handleSelectLesson = (lessonId: string) => {
    if (onSelectLesson) {
      onSelectLesson(lessonId);
    } else {
      router.push(`/courses/${courseId}/lessons/${lessonId}`);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={cn(
          'flex flex-col border-l bg-card/30 items-center py-4 w-16 transition-all duration-300',
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          title="Expand contents"
        >
          <PanelRightOpen className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-80 border-l bg-card/30 flex flex-col h-full transition-all duration-300',
        className
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg">Course Contents</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dialog.open()}
            title="Add module"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            title="Collapse contents"
          >
            <PanelRightClose className="w-4 h-4" />
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
          <Accordion type="multiple" className="w-full">
            {modules.map((module) => (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="border-b-0"
              >
                <AccordionTrigger className="hover:no-underline py-3 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center text-sm font-medium">
                    {module.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 px-1">
                  <div className="flex flex-col space-y-1 mt-1 pl-4 border-l-2 ml-3">
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson.id)}
                        className={`flex items-center text-sm py-2 px-3 rounded-md transition-colors text-left ${
                          activeLessonId === lesson.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <FileText className="w-4 h-4 mr-2 opacity-70 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    ))}
                    {module.lessons.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 px-3">
                        No lessons yet
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
          fields={createModuleFields as any}
          onSubmit={onCreateSubmit}
          submitLabel="Create Module"
          isLoading={isCreatingModule}
        />
      </DialogTemplate>
    </div>
  );
}
