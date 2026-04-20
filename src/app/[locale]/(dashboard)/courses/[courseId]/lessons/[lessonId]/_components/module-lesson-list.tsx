import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { Module } from '../../../use-modules';

interface ModuleLessonListProps {
  modules: Module[];
  activeLessonId?: string;
  onSelectLesson: (lessonId: string) => void;
}

/**
 * Accordion list of modules and their lessons.
 * Used inside `LessonOutline` (popover outline panel).
 */
export function ModuleLessonList({
  modules,
  activeLessonId,
  onSelectLesson,
}: ModuleLessonListProps) {
  const t = useTranslations('Courses.ModuleAccordion');

  return (
    <Accordion type="multiple" className="w-full">
      {modules.map((module) => (
        <AccordionItem key={module.id} value={module.id} className="border-b-0">
          <AccordionTrigger className="rounded-md px-2 py-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center font-medium text-sm">
              {module.title}
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-1 pb-3">
            <div className="mt-1 ml-3 flex flex-col space-y-1 border-l-2 pl-4">
              {module.lessons.map((lesson) => (
                <button
                  type="button"
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson.id)}
                  className={cn(
                    'flex items-center rounded-md px-3 py-2 text-left text-sm transition-colors',
                    activeLessonId === lesson.id
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{lesson.title}</span>
                </button>
              ))}
              {module.lessons.length === 0 && (
                <p className="px-3 py-2 text-muted-foreground text-xs">
                  {t('noLessons')}
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
