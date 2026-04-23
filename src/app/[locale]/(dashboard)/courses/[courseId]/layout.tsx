'use client';

import { useParams } from 'next/navigation';
import type React from 'react';
import { useCourses } from '../use-courses';

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { courseId } = useParams();
  useCourses(courseId as string);

  return <>{children}</>;
}
