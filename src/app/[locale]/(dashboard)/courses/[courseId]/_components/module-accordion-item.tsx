import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import type { Module } from '../use-modules';

interface ModuleAccordionItemProps {
  moduleItem: Module;
  courseId: string;
  /** Called with the module ID when the user clicks "Add lesson" */
  onAddLesson: (moduleId: string) => void;
}

export function ModuleAccordionItem({
  moduleItem,
  courseId,
  onAddLesson,
}: ModuleAccordionItemProps) {
  const tAccordion = useTranslations('Courses.ModuleAccordion');
  const tDialog = useTranslations('Courses.AddLessonDialog');

  return (
    <AccordionItem
      value={moduleItem.id}
      className="overflow-hidden rounded-md border bg-card shadow-sm"
    >
      <div className="group/module-row relative">
        <AccordionTrigger className="flex items-center justify-between border-b bg-muted/40 p-4 font-medium text-foreground transition-colors hover:bg-muted/60">
          <div className="flex w-full items-center justify-between pr-24">
            <span className="text-lg">{moduleItem.title}</span>
          </div>
        </AccordionTrigger>

        {/* Absolutely positioned so it doesn't nest inside the trigger */}
        <div className="absolute top-3.25 right-12 z-10">
          <Button
            size="sm"
            variant="default"
            className="h-8 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddLesson(moduleItem.id);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {tDialog('submit')}
          </Button>
        </div>

        <AccordionContent className="m-0 border-none bg-card p-0 text-sm">
          <div className="divide-y">
            {moduleItem.lessons.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground italic">
                {tAccordion('noLessons')}
              </div>
            ) : (
              moduleItem.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${courseId}/lessons/${lesson.id}`}
                  className="group flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <BookOpen className="h-4 w-4" strokeWidth={2} />
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
  );
}
