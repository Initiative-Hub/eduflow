import type { Metadata } from 'next';
import { RolesClient } from './client';

export const metadata: Metadata = {
  title: 'Course Roles',
};

export default async function CourseRolesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <RolesClient courseId={courseId} />;
}
