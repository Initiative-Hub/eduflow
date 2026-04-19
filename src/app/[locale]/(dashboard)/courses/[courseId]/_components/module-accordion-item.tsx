import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Module } from '../use-modules';

interface ModuleAccordionItemProps {
  moduleItem: Module;
  courseId: string;
  /** Called with the module ID when the user clicks "Add lesson" */
  onAddLesson: (moduleId: string) => void;
}

/**
 * A single module row inside the course modules accordion.
 * Extracted from the modules page to keep each level of the tree small.
 */
export function ModuleAccordionItem({
  moduleItem,
  courseId,
  onAddLesson,
}: ModuleAccordionItemProps) {
  return (
    <AccordionItem
      value={moduleItem.id}
      className="border bg-card rounded-md shadow-sm overflow-hidden"
    >
      <div className="relative group/module-row">
        <AccordionTrigger className="bg-muted/40 p-4 border-b font-medium flex justify-between items-center text-foreground hover:bg-muted/60 transition-colors">
          <div className="flex justify-between items-center w-full pr-24">
            <span className="text-lg">{moduleItem.title}</span>
          </div>
        </AccordionTrigger>

        {/* Absolutely positioned so it doesn't nest inside the trigger */}
        <div className="absolute right-12 top-[13px] z-10">
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
  );
}
