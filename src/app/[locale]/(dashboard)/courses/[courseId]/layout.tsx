'use client';

import { useParams, usePathname } from 'next/navigation';
import { CourseMenuSidebar } from './_components/course-menu-sidebar';
import { LessonOutlineSidebar } from './_components/lesson-outline-sidebar'; 

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const courseId = params.courseId as string;

  const isLessonRoute = pathname.includes('/lessons/');

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] -m-6 md:-m-10 lg:-m-12 bg-background border-t">
      {!isLessonRoute ? (
        <CourseMenuSidebar courseId={courseId} />
      ) : (
        <LessonOutlineSidebar courseId={courseId} />
      )}
      
      <div className="flex-1 flex flex-col overflow-y-auto max-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  );
}