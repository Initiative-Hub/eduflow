import { CourseModulesClient } from './course-modules-client';

interface CourseModulesPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseModulesPage({
  params,
}: CourseModulesPageProps) {
  const { courseId } = await params;

  return <CourseModulesClient courseId={courseId} />;
}
