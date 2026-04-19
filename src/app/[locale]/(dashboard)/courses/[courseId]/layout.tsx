'use client';

import { useParams } from 'next/navigation';

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 h-full min-h-[calc(100vh-4rem)] -m-6 md:-m-10 lg:-m-12 bg-background border-t">
      <div className="flex-1 flex flex-col overflow-y-auto max-h-[calc(100vh-4rem)] relative w-full">
        {children}
      </div>
    </div>
  );
}