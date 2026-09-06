import { NextResponse } from 'next/server';
import { z } from 'zod';

export const courseParamsSchema = z.object({
  courseId: z.string().uuid(),
});

export function mapCourseActionError(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Internal Server Error';

  if (message === 'Course not found') {
    return NextResponse.json({ message }, { status: 404 });
  }

  if (message === 'Forbidden' || message === 'Unauthorized') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (message === 'Course member not found') {
    return NextResponse.json({ message }, { status: 404 });
  }

  if (
    message === 'Course ID confirmation does not match' ||
    message === 'Course capacity cannot be below active member count' ||
    message === 'Course owner cannot leave the course' ||
    message === 'New owner must be another course member'
  ) {
    return NextResponse.json({ message }, { status: 400 });
  }

  console.error('Course action route error:', error);
  return NextResponse.json(
    { message: 'Internal Server Error' },
    { status: 500 }
  );
}
