'use client';

import { useParams } from 'next/navigation';
import { LessonOutlineSidebar } from '../_components/lesson-outline-sidebar';

export default function LessonViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const courseId = params.courseId as string;
  const activeLessonId = params.lessonId as string | undefined;

  return (
    <div className="flex-1 flex flex-col w-full bg-background overflow-y-auto max-h-[calc(100vh-4rem)]">
      {children}
    </div>
  );
}
