'use client';

import { ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LessonOutline } from './lesson-outline';

interface LessonHeaderProps {
  courseId: string;
  lessonId: string;
  currentModuleTitle: string;
  currentLessonTitle: string;
  showOutline: boolean;
  setShowOutline: (val: boolean) => void;
}

export function LessonHeader({
  courseId,
  lessonId,
  currentModuleTitle,
  currentLessonTitle,
  showOutline,
  setShowOutline,
}: LessonHeaderProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-40 -mx-6 -mt-6 flex items-center justify-between border-foreground/20 border-b bg-background/95 px-6 py-3 backdrop-blur-sm md:-mx-10 md:-mt-10 md:px-10">
      <div className="mr-4 flex min-w-0 items-center gap-2 text-muted-foreground text-sm">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/courses/${courseId}`}
              className="max-w-30 truncate transition-colors hover:text-primary md:max-w-50"
            >
              {currentModuleTitle}
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="wrap-break-word max-w-xs"
          >
            {currentModuleTitle}
          </TooltipContent>
        </Tooltip>

        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-37.5 cursor-default truncate font-medium text-foreground md:max-w-xs">
              {currentLessonTitle}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="wrap-break-word max-w-xs"
          >
            {currentLessonTitle}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
