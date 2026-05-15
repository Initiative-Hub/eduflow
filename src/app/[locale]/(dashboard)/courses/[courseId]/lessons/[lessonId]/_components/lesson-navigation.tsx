import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
          <Button variant="outline" asChild className="h-auto px-4 py-3">
            <Link href={prev.href}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span className="max-w-37.5 truncate md:max-w-50">
                {prev.title}
              </span>
            </Link>
          </Button>
        ) : (
          <div /> // Spacer when previous item doesn't exist
        )}

        {next ? (
          <Button variant="outline" asChild className="h-auto px-4 py-3">
            <Link href={next.href}>
              <span className="max-w-37.5 truncate md:max-w-50">
                {next.title}
              </span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div /> // Spacer when next item doesn't exist
        )}
      </div>
    </div>
  );
}
