'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useModules } from '../use-modules';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen } from 'lucide-react';

export default function CourseModulesPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { modules, isLoading, isCreatingModule, handleCreateModule } = useModules(courseId);

  const [newModuleTitle, setNewModuleTitle] = useState('');

  const onCreateModule = () => {
    if (!newModuleTitle.trim()) return;
    handleCreateModule({ title: newModuleTitle.trim() }, {
      onSuccess: () => setNewModuleTitle(''),
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 p-6 md:p-8">
      <div className="flex justify-between items-end pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Modules</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your course syllabus and materials</p>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="New Module Title..." 
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            className="w-64"
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
        <div className="space-y-4">
          {modules.map((moduleItem) => (
            <div key={moduleItem.id} className="border bg-card rounded-md shadow-sm overflow-hidden">
              <div className="bg-muted/40 p-4 border-b font-medium flex justify-between items-center text-foreground">
                <span className="text-lg">{moduleItem.title}</span>
                <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">
                  Module {moduleItem.orderIndex + 1}
                </span>
              </div>
              <div className="divide-y bg-card text-sm">
                {moduleItem.lessons.length === 0 ? (
                  <div className="p-4 text-muted-foreground italic text-center">
                    No lessons in this module. Edit to add content.
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
                      <span className="text-xs text-muted-foreground group-hover:text-foreground">View Lesson →</span>
                    </Link>
                  ))
                )}
                {/* Add "Add Lesson" button */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
