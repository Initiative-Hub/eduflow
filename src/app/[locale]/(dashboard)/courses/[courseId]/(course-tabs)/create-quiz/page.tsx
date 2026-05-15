import { CreateQuizClient } from './create-quiz-client';

interface CreateQuizPageProps {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ moduleId?: string; lessonId?: string }>;
}

export default async function CreateQuizPage({
  params,
  searchParams,
}: CreateQuizPageProps) {
  const { courseId } = await params;
  const { moduleId, lessonId } = await searchParams;

  return (
    <CreateQuizClient
      courseId={courseId}
      preselectedModuleId={moduleId}
      lessonId={lessonId}
    />
  );
}
