import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CourseContentDraft } from '../../use-generate-course-content';

type CourseContentPreviewProps = {
  courseContentDraft: CourseContentDraft | null | undefined;
};

export function CourseContentPreview({
  courseContentDraft,
}: CourseContentPreviewProps) {
  const genT = useTranslations('Courses.CourseModules.CourseContentGeneration');
  const modules = courseContentDraft?.modules ?? [];

  if (modules.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/20 px-4 py-5 text-center text-muted-foreground text-sm">
        {genT('startingCourseContentGeneration')}
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-muted/20 p-3">
      {modules.map((module, moduleIndex) => (
        <div
          key={`${module.title ?? 'module'}-${moduleIndex}`}
          className="rounded-lg border bg-background px-3 py-2 shadow-sm"
        >
          <p className="font-semibold text-sm">
            {moduleIndex + 1}. {module.title || genT('identifyingModule')}
          </p>
          {module.lessons && module.lessons.length > 0 && (
            <ul className="mt-1 space-y-0.5 pl-4">
              {module.lessons.map((lesson, lessonIndex) => (
                <li
                  key={`${lesson.lessonTitle ?? 'lesson'}-${lessonIndex}`}
                  className="flex items-center gap-1.5 text-muted-foreground text-xs"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  {lesson.lessonTitle || genT('draftingLesson')}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
