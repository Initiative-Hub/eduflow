'use client';

import { AssignmentEditor } from '@/components/assignments/assignment-editor';
import {
  useAssignment,
  useUpdateAssignment,
} from '../../../assignments/use-assignment';
import { TeacherSubmissionsPanel } from '@/components/assignments/teacher-submissions-panel';
import { StudentSubmissionPanel } from '@/components/assignments/student-submission-panel';

export function AssignmentDetailsClient({
  courseId,
  assignmentId,
}: {
  courseId: string;
  assignmentId: string;
}) {
  const assignmentQuery = useAssignment(assignmentId);
  const updateMutation = useUpdateAssignment(courseId);

  if (assignmentQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
  }

  const assignment = assignmentQuery.data;

  if (!assignment) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        Assignment not found.
      </p>
    );
  }

  return (
    <div className="pb-12">
      <AssignmentEditor
        title={assignment.title}
        content={assignment.content}
        canEdit={assignment.canEdit}
        onSave={(data, options) => {
          updateMutation.mutate(
            {
              assignmentId: assignment.id,
              title: data.title,
              content: data.content,
            },
            {
              onSuccess: () => {
                options.onSuccess();
              },
            }
          );
        }}
      />

      <div className="mx-auto mt-6 max-w-5xl px-6">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm">
            Maximum score: <strong>{assignment.maxPoints}</strong>
          </p>

          {assignment.dueAt ? (
            <p className="mt-1 text-muted-foreground text-sm">
              Due: {new Date(assignment.dueAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        {assignment.canGrade ? (
          <TeacherSubmissionsPanel assignment={assignment} />
        ) : (
          <StudentSubmissionPanel assignment={assignment} />
        )}
      </div>
    </div>
  );
}
