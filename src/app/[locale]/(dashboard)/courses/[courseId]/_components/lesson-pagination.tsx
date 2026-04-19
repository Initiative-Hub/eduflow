import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mt-12 pt-6 border-t font-medium">
        {prev ? (
          <Button variant="outline" asChild className="h-auto py-3 px-4">
            <Link href={`/courses/${courseId}/lessons/${prev.id}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="max-w-37.5 md:max-w-50 truncate">
                {prev.title}
              </span>
            </Link>
          </Button>
        ) : (
          <div /> // Spacer when previous lesson doesn't exist
        )}

        {next ? (
          <Button variant="outline" asChild className="h-auto py-3 px-4">
            <Link href={`/courses/${courseId}/lessons/${next.id}`}>
              <span className="max-w-37.5 md:max-w-50 truncate">
                {next.title}
              </span>
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <div /> // Spacer when next lesson doesn't exist
        )}
      </div>
    </div>
  );
}
