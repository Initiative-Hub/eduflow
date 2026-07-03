'use client';

import { useQuery } from '@tanstack/react-query';
import { gradesService } from './grades.service';

export function useGrades(courseId: string) {
  return useQuery({
    queryKey: ['course-grades', courseId],
    queryFn: () => gradesService.listForCourse(courseId),
    enabled: !!courseId,
  });
}
