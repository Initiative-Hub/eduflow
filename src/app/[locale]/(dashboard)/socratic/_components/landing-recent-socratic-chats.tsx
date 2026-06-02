'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Clock3, GraduationCap } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { socraticService } from '../socratic.service';

const RECENT_SOCRATIC_SESSION_LIMIT = 5;

export function LandingRecentSocraticChats() {
  const t = useTranslations('SocraticPage.recentSessions');
  const sidebarT = useTranslations('SocraticPage.sidebar');
  const locale = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-socratic-chats'],
    queryFn: () =>
      socraticService.listChats({
        limit: RECENT_SOCRATIC_SESSION_LIMIT,
        offset: 0,
      }),
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-16" key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/50 bg-background/50 p-4 text-muted-foreground text-sm">
        {t('error')}
      </Card>
    );
  }

  if (!data?.data.length) return null;

  return (
    <section className="w-full px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold font-heading text-foreground/90 text-lg">
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('description')}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {data.data.map((session) => {
          const title = session.title || sidebarT('untitled');
          return (
            <Link
              aria-label={t('openChat', { title })}
              href={`/socratic/${session.id}`}
              key={session.id}
            >
              <Card className="group flex cursor-pointer flex-row items-center gap-3 border-primary p-4 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-primary/20">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-white/80 shadow-sm dark:bg-zinc-900/80">
                  <GraduationCap className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground/90 text-sm">
                    {title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                    <span>
                      {sidebarT('messageCount', {
                        count: session.messageCount,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3" />
                      {t('updated', {
                        date: dateFormatter.format(new Date(session.updatedAt)),
                      })}
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
