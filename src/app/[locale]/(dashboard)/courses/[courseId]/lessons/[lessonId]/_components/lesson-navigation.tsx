import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  title: string;
  href: string;
}

interface LessonNavigationProps {
  courseId: string;
  prev: NavItem | null;
  next: NavItem | null;
}

/**
 * Navigation component for lesson/quiz pages.
 * Supports navigating between lessons and quizzes in sequence.
 */
export function LessonNavigation({ prev, next }: LessonNavigationProps) {
  return (
    <div className="flex w-full flex-col">
      <div className="mt-12 flex items-center justify-between border-t pt-6 font-medium">
        {prev ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                asChild
                className="h-auto max-w-[45%] px-4 py-3"
              >
                <Link href={prev.href} className="flex min-w-0 items-center">
                  <ChevronLeft className="mr-2 h-4 w-4 shrink-0" />
                  <span className="max-w-37.5 truncate md:max-w-50">
                    {prev.title}
                  </span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="wrap-break-word max-w-xs"
            >
              {prev.title}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div /> // Spacer when previous item doesn't exist
        )}

        {next ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                asChild
                className="h-auto max-w-[45%] px-4 py-3"
              >
                <Link href={next.href} className="flex min-w-0 items-center">
                  <span className="max-w-37.5 truncate md:max-w-50">
                    {next.title}
                  </span>
                  <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
              className="wrap-break-word max-w-xs"
            >
              {next.title}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div /> // Spacer when next item doesn't exist
        )}
      </div>
    </div>
  );
}
