'use client';

import { useCourses } from './use-courses';
import { CourseCard } from './_components/course-card';
import { CreateCourseDialog } from './_components/create-course-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useDialog } from '@/components/custom/dialog/use-dialog';
import { BookOpen } from 'lucide-react';

export default function CoursesPage() {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Manage and publish your courses here.
          </p>
        </div>
        <Button onClick={() => dialog.open()}>
          <Plus className="mr-2 h-4 w-4" /> New Course
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl border bg-card/50 shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
          <p className="text-muted-foreground mb-6 max-w-100">
            You haven't created any courses. Click the button below to create
            your first one.
          </p>
          <Button onClick={() => dialog.open()}>
            Create Your First Course
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
