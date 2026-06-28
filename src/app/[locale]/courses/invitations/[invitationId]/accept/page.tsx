import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { InvitationErrorPage } from './error-page';

export default async function AcceptCourseInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  const result = await CourseInvitationService.acceptDirectInvitation({
    invitationId,
    userId: session.user.id,
  }).catch(() => null);

  // Genuine 404 — invitation doesn't exist or course is deleted
  if (!result) {
    notFound();
  }

  // Happy path — go straight to the course
  if (result.ok) {
    redirect(`/courses/${result.courseId}`);
  }

  // Render contextual error card for each recoverable failure
  return <InvitationErrorPage result={result} />;
}
