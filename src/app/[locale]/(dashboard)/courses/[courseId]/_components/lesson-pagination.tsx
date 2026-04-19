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
              <div className="flex flex-col items-start ml-1 text-left mr-2">
                <span className="text-xs text-muted-foreground leading-tight font-normal">
                  Previous
                </span>
                <span className="max-w-[150px] md:max-w-[200px] truncate">
                  {prev.title}
                </span>
              </div>
            </Link>
          </Button>
        ) : (
          <div /> // Spacer
        )}

        {next ? (
          <Button variant="outline" asChild className="h-auto py-3 px-4">
            <Link href={`/courses/${courseId}/lessons/${next.id}`}>
              <div className="flex flex-col items-end mr-1 text-right ml-2">
                <span className="text-xs text-muted-foreground leading-tight font-normal">
                  Next
                </span>
                <span className="max-w-[150px] md:max-w-[200px] truncate">
                  {next.title}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <div /> // Spacer
        )}
      </div>
    </div>
  );
}
