import { NextResponse } from 'next/server';

export function mapCourseMemberError(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Internal Server Error';

  if (message === 'Course member not found') {
    return NextResponse.json({ message }, { status: 404 });
  }

  if (
    message === 'Course not found' ||
    message === 'Invitation not found' ||
    message === 'Invite link not found'
  ) {
    return NextResponse.json({ message }, { status: 404 });
  }

  if (
    message === 'Cannot assign the course owner role' ||
    message === 'Course owner cannot be removed' ||
    message === 'Course owner role cannot be changed' ||
    message === 'Invalid course member role' ||
    message === 'User is already a course member' ||
    message === 'User cannot be added to courses' ||
    message === 'User cannot be invited to courses' ||
    message === 'You cannot remove yourself from the course'
  ) {
    return NextResponse.json({ message }, { status: 400 });
  }

  if (
    message === 'Invitation belongs to another user' ||
    message === 'Invitation is not pending' ||
    message === 'Invitation has expired' ||
    message === 'Invite link has been revoked' ||
    message === 'Invite link has expired' ||
    message === 'Invite link usage limit reached'
  ) {
    return NextResponse.json({ message }, { status: 400 });
  }

  console.error('Course member route error:', error);
  return NextResponse.json(
    { message: 'Internal Server Error' },
    { status: 500 }
  );
}
