'use client';

import { ChevronRight, Edit3, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { TiptapDocument } from '@/utils/lesson-content';
import { LessonOutline } from './lesson-outline';

interface LessonHeaderProps {
  courseId: string;
  lessonId: string;
  currentModuleTitle: string;
  currentLessonTitle: string;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  setEditTitle: (val: string) => void;
  setEditContent: (val: TiptapDocument) => void;
  originalContent: TiptapDocument;
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
  const t = useTranslations('Courses.LessonHeader');

  return (
    <div className="sticky top-0 z-40 -mx-6 -mt-6 flex items-center justify-between border-foreground/20 border-b bg-background/95 px-6 py-3 backdrop-blur-sm md:-mx-10 md:-mt-10 md:px-10 lg:-mx-12 lg:-mt-12 lg:px-12">
      <div className="mr-4 flex items-center gap-2 text-muted-foreground text-sm">
        <Popover open={showOutline} onOpenChange={setShowOutline}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 -ml-2 h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted/60"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="flex h-[66vh] w-80 flex-col overflow-hidden p-0"
          >
            <LessonOutline
              courseId={courseId}
              activeLessonId={lessonId}
              onSelectLesson={(id) => {
                setShowOutline(false);
                router.push(`/courses/${courseId}/lessons/${id}`);
              }}
              className="h-full w-full border-none bg-transparent"
            />
          </PopoverContent>
        </Popover>
        <Link
          href={`/courses/${courseId}`}
          className="max-w-30 truncate transition-colors hover:text-primary md:max-w-50"
        >
          {currentModuleTitle}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        <span className="max-w-37.5 truncate font-medium text-foreground md:max-w-xs">
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
            <Edit3 className="mr-2 h-4 w-4" />
            {t('edit')}
          </Button>
        )}
      </div>
    </div>
  );
}
