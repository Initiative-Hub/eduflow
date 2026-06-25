import {
  BookOpen,
  CircleCheck,
  CircleX,
  Clock,
  Users,
  UserX,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CourseInvitationStatus } from '@/generated/prisma';
import { Link } from '@/i18n/navigation';

type InvitationErrorResult =
  | { ok: false; reason: 'wrong_user' }
  | {
      ok: false;
      reason: 'not_pending';
      status: CourseInvitationStatus;
      courseId: string;
    }
  | { ok: false; reason: 'expired'; expiresAt: Date; courseId: string }
  | { ok: false; reason: 'capacity_full'; courseId: string };

export async function InvitationErrorPage({
  result,
}: {
  result: InvitationErrorResult;
}) {
  const t = await getTranslations('AcceptInvitationPage');

  if (result.reason === 'wrong_user') {
    return (
      <ErrorCard
        icon={<UserX className="size-7 text-destructive" />}
        iconBg="bg-destructive/10"
        title={t('wrongUser.title')}
        description={t('wrongUser.description')}
        actions={
          <>
            <Button asChild size="lg" className="w-full">
              <Link href="/login">{t('wrongUser.switchAccount')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/">{t('actions.goHome')}</Link>
            </Button>
          </>
        }
      />
    );
  }

  if (result.reason === 'expired') {
    return (
      <ErrorCard
        icon={<Clock className="size-7 text-muted-foreground" />}
        iconBg="bg-muted/60"
        title={t('expired.title')}
        description={t('expired.description', {
          date: result.expiresAt.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        })}
        actions={
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/">{t('actions.goHome')}</Link>
          </Button>
        }
      />
    );
  }

  if (result.reason === 'capacity_full') {
    return (
      <ErrorCard
        icon={<Users className="size-7 text-destructive" />}
        iconBg="bg-destructive/10"
        title={t('capacityFull.title')}
        description={t('capacityFull.description')}
        actions={
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/">{t('actions.goHome')}</Link>
          </Button>
        }
      />
    );
  }

  // reason === 'not_pending'
  const isAccepted = result.status === CourseInvitationStatus.ACCEPTED;
  const isDeclined = result.status === CourseInvitationStatus.DECLINED;

  return (
    <ErrorCard
      icon={
        isAccepted ? (
          <CircleCheck className="size-7 text-primary" />
        ) : (
          <CircleX className="size-7 text-muted-foreground" />
        )
      }
      iconBg={isAccepted ? 'bg-primary/10' : 'bg-muted/60'}
      title={
        isAccepted
          ? t('notPending.acceptedTitle')
          : isDeclined
            ? t('notPending.declinedTitle')
            : t('notPending.cancelledTitle')
      }
      description={
        isAccepted
          ? t('notPending.acceptedDescription')
          : isDeclined
            ? t('notPending.declinedDescription')
            : t('notPending.cancelledDescription')
      }
      actions={
        <>
          {isAccepted ? (
            <Button asChild size="lg" className="w-full">
              <Link href={`/courses/${result.courseId}`}>
                <BookOpen data-icon="inline-start" />
                {t('actions.goToCourse')}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/">{t('actions.goHome')}</Link>
          </Button>
        </>
      }
    />
  );
}

// ─── Shared card layout ──────────────────────────────────────────────────────

function ErrorCard({
  icon,
  iconBg,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm items-center justify-center px-4 py-10">
      <Card className="w-full border-border/70 bg-card/95 p-0 shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div
            className={`flex size-16 items-center justify-center rounded-xl border ${iconBg}`}
          >
            {icon}
          </div>

          <div className="space-y-2">
            <h1 className="font-heading font-semibold text-xl tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>

          <div className="flex w-full flex-col gap-2">{actions}</div>
        </CardContent>
      </Card>
    </div>
  );
}
