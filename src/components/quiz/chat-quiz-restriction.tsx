'use client';

import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { useActiveQuizAttempts } from '@/hooks/use-active-quiz-attempts';
import { Link } from '@/i18n/navigation';

export function ChatQuizRestriction({
  access,
}: {
  access: ReturnType<typeof useActiveQuizAttempts>;
}) {
  const t = useTranslations('QuizAttempts');
  if (!access.blocked) return null;

  return (
    <Alert className="mx-auto max-w-3xl">
      <AlertTitle>{t('aiBlockedTitle')}</AlertTitle>
      <AlertDescription>
        <p>
          {access.checking
            ? t('checking')
            : access.isError
              ? t('loadError')
              : t('aiBlocked')}
        </p>
        {access.isError && (
          <Button variant="outline" onClick={() => void access.refetch()}>
            {t('retry')}
          </Button>
        )}
        <ul className="flex w-full flex-col gap-2">
          {access.attempts.map((attempt) => (
            <li key={attempt.id} className="flex flex-wrap items-center gap-2">
              <Link
                className="underline underline-offset-4"
                href={attempt.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {attempt.courseTitle} · {attempt.title} — {t('resume')}
              </Link>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
