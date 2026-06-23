import { NextResponse } from 'next/server';

export function mapCourseMemberError(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Internal Server Error';

  if (message === 'Course member not found') {
    return NextResponse.json({ message }, { status: 404 });
  }

  if (
    message === 'Cannot assign the course owner role' ||
    message === 'Course owner cannot be removed' ||
    message === 'Course owner role cannot be changed' ||
    message === 'Invalid course member role' ||
    message === 'User is already a course member' ||
    message === 'User cannot be added to courses' ||
    message === 'You cannot remove yourself from the course'
  ) {
    return NextResponse.json({ message }, { status: 400 });
  }

  console.error('Course member route error:', error);
  return NextResponse.json(
    { message: 'Internal Server Error' },
    { status: 500 }
  );
}
