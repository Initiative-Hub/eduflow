'use client';

import { ChevronRight, Edit3, Menu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { LessonOutline } from './lesson-outline';

interface LessonHeaderProps {
  courseId: string;
  lessonId: string;
  currentModuleTitle: string;
  currentLessonTitle: string;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  setEditTitle: (val: string) => void;
  setEditContent: (val: string) => void;
  originalContent: string;
  showOutline: boolean;
  setShowOutline: (val: boolean) => void;
}

export function LessonHeader({
  courseId,
  lessonId,
  currentModuleTitle,
  currentLessonTitle,
  isEditing,
  setIsEditing,
  setEditTitle,
  setEditContent,
  originalContent,
  showOutline,
  setShowOutline,
}: LessonHeaderProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-foreground/20 dark:border-border bg-transparent -mt-6 md:-mt-10 lg:-mt-12 -mx-6 md:-mx-10 lg:-mx-12 px-6 md:px-10 lg:px-12 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
        <Popover open={showOutline} onOpenChange={setShowOutline}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2 text-muted-foreground mr-1 shrink-0 hover:bg-muted/60"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="p-0 w-80 h-[66vh] flex flex-col overflow-hidden"
          >
            <LessonOutline
              courseId={courseId}
              activeLessonId={lessonId}
              onSelectLesson={(id) => {
                setShowOutline(false);
                router.push(`/courses/${courseId}/lessons/${id}`);
              }}
              className="w-full h-full border-none bg-transparent"
            />
          </PopoverContent>
        </Popover>
        <Link
          href={`/courses/${courseId}`}
          className="hover:text-primary transition-colors truncate max-w-30 md:max-w-50"
        >
          {currentModuleTitle}
        </Link>
        <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
        <span className="font-medium text-foreground truncate max-w-37.5 md:max-w-xs">
          {currentLessonTitle}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTitle(currentLessonTitle);
              setEditContent(originalContent);
              setIsEditing(true);
            }}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Lesson
          </Button>
        )}
      </div>
    </div>
  );
}
