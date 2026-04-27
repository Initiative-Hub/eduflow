import { getTranslations } from 'next-intl/server';
import { LessonDetailsClient } from './lesson-details-client';

interface LessonDetailsPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonDetailsPage({
  params,
}: LessonDetailsPageProps) {
  const [{ courseId, lessonId }, tH, tP, tV] = await Promise.all([
    params,
    getTranslations('Courses.LessonHeader'),
    getTranslations('Courses.LessonPage'),
    getTranslations('Courses.LessonView'),
  ]);

  return (
    <div className="space-y-8 pb-10">
      <LessonDetailsClient
        courseId={courseId}
        lessonId={lessonId}
        moduleFallbackTitle={tH('modules')}
        lessonFallbackTitle={tH('lesson')}
        notFoundLabel={tP('notFound')}
        emptyContentLabel={tV('empty')}
      />
    </div>
  );
}
