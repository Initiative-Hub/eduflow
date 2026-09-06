import { apiClient } from '@/lib/api/api-client';
import type { StudentGradeAttempt } from './grades.types';

export const gradesService = {
  listForCourse: (courseId: string) =>
    apiClient.get<StudentGradeAttempt[]>(`v1/courses/${courseId}/grades`),
};
