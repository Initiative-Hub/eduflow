import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { JoinInviteButton } from './join-invite-button';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CourseInvitePage');
  return { title: t('metadataTitle') };
}

export default async function CourseInvitePage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  const t = await getTranslations('CourseInvitePage');
  const session = await auth.api.getSession({ headers: await headers() });
  const invite = await CourseInvitationService.getPublicInviteView(
    inviteId,
    session?.user.id
  ).catch(() => null);

  if (!invite) {
    notFound();
  }

  const unavailable =
    invite.isAlreadyJoined ||
    invite.isRevoked ||
    invite.isExpired ||
    invite.isUsageLimitReached ||
    invite.isCapacityFull;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-10">
      <Card className="w-full border-border/70 bg-card/95 p-0 shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-xl border bg-muted/40">
            <BookOpen className="size-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading font-semibold text-2xl tracking-tight">
              {invite.course.title}
            </h1>
            <p className="text-muted-foreground">
              {t('description', { course: invite.course.title })}
            </p>
          </div>

          {unavailable ? (
            <Alert variant="destructive" className="text-left">
              <AlertTitle>{t('unavailable.title')}</AlertTitle>
              <AlertDescription>
                {invite.isAlreadyJoined
                  ? t('unavailable.alreadyJoined')
                  : invite.isRevoked
                    ? t('unavailable.revoked')
                    : invite.isCapacityFull
                      ? t('unavailable.capacity')
                      : invite.isUsageLimitReached
                        ? t('unavailable.limit')
                        : t('unavailable.expired')}
              </AlertDescription>
            </Alert>
          ) : null}

          <JoinInviteButton disabled={unavailable} inviteId={inviteId} />
        </CardContent>
      </Card>
    </div>
  );
}
