import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface LessonReference {
  id: string;
  title: string;
}

interface LessonPaginationProps {
  courseId: string;
  prev: LessonReference | null;
  next: LessonReference | null;
}

export function LessonPagination({
  courseId,
  prev,
  next,
}: LessonPaginationProps) {
  return (
    <div className="flex w-full flex-col">
      <div className="mt-12 flex items-center justify-between border-t pt-6 font-medium">
        {prev ? (
          <Button variant="outline" asChild className="h-auto px-4 py-3">
            <Link href={`/courses/${courseId}/lessons/${prev.id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span className="max-w-37.5 truncate md:max-w-50">
                {prev.title}
              </span>
            </Link>
          </Button>
        ) : (
          <div /> // Spacer when previous lesson doesn't exist
        )}

        {next ? (
          <Button variant="outline" asChild className="h-auto px-4 py-3">
            <Link href={`/courses/${courseId}/lessons/${next.id}`}>
              <span className="max-w-37.5 truncate md:max-w-50">
                {next.title}
              </span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div /> // Spacer when next lesson doesn't exist
        )}
      </div>
    </div>
  );
}
