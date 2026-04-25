'use client';

import { BookOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDialog } from '@/components/custom/dialog/use-dialog';
import { Button } from '@/components/ui/button';
import { useCourses } from '../use-courses';
import { CourseCard } from './course-card';
import { CreateCourseDialog } from './create-course-dialog';

export function CoursesPageClient() {
  const t = useTranslations('Courses');
  const {
    courses,
    isLoading,
    isCreating,
    handleCreateCourse,
    handleTogglePublish,
  } = useCourses();
  const dialog = useDialog();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => dialog.open()}>
          <Plus className="mr-2 h-4 w-4" /> {t('newCourse')}
        </Button>
      </div>

      <CreateCourseDialog
        isOpen={dialog.isOpen}
        onOpenChange={dialog.setIsOpen}
        onSubmit={(data) =>
          handleCreateCourse(data, { onSuccess: () => dialog.close() })
        }
        isLoading={isCreating}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl border bg-card/50 shadow-sm"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 font-semibold text-xl">{t('noCourses')}</h2>
          <p className="mb-6 max-w-100 text-muted-foreground">
            {t('noCoursesDescription')}
          </p>
          <Button onClick={() => dialog.open()}>
            {t('createFirstCourse')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              description={course.description}
              isPublished={course.isPublished}
              modulesCount={course._count?.modules || 0}
              enrollmentsCount={course._count?.enrollments || 0}
              onTogglePublish={handleTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}
