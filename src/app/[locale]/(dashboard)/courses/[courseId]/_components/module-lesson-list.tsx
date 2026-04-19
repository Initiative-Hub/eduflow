import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Module } from '../use-modules';

interface ModuleLessonListProps {
  modules: Module[];
  activeLessonId?: string;
  onSelectLesson: (lessonId: string) => void;
}

/**
 * Accordion list of modules and their lessons.
 * Used inside `LessonOutlineSidebar` (popover outline panel).
 * Extracted to isolate the tree rendering from sidebar chrome and dialog logic.
 */
export function ModuleLessonList({
  modules,
  activeLessonId,
  onSelectLesson,
}: ModuleLessonListProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {modules.map((module) => (
        <AccordionItem key={module.id} value={module.id} className="border-b-0">
          <AccordionTrigger className="py-3 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <div className="flex items-center text-sm font-medium">
              {module.title}
            </div>
          </AccordionTrigger>

          <AccordionContent className="pb-3 px-1">
            <div className="flex flex-col space-y-1 mt-1 pl-4 border-l-2 ml-3">
              {module.lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson.id)}
                  className={cn(
                    'flex items-center text-sm py-2 px-3 rounded-md transition-colors text-left',
                    activeLessonId === lesson.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
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
  );
}
