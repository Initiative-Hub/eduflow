import { ExternalLink, GraduationCap, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import InteractiveContentPreview from '@/app/[locale]/(dashboard)/study/_components/interactive-content-preview';
import { auth } from '@/lib/auth';
import { StudyShareService } from '@/services/StudyShareService';

interface SharedInteractiveContentPageProps {
  params: Promise<{
    shareId: string;
  }>;
}

export async function generateMetadata({
  params,
}: SharedInteractiveContentPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const content = await StudyShareService.getPublicInteractiveContent(shareId);

  return {
    title: content ? `${content.content.title} | EduFlow` : 'Shared Activity',
  };
}

export default async function SharedInteractiveContentPage({
  params,
}: SharedInteractiveContentPageProps) {
  const [{ shareId }, t, sessionData] = await Promise.all([
    params,
    getTranslations('StudyPage.sharedInteractiveContent'),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const sharedContent =
    await StudyShareService.getPublicInteractiveContent(shareId);

  if (!sharedContent) {
    notFound();
  }

  const { content } = sharedContent;
  const isOwner =
    Boolean(sharedContent.ownerUserId) &&
    sharedContent.ownerUserId === sessionData?.user?.id;
  const ctaHref =
    isOwner && sharedContent.sourceChatId
      ? `/study/${sharedContent.sourceChatId}`
      : '/study';
  const CtaIcon = isOwner ? ExternalLink : GraduationCap;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-5 border-border border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">
            <p className="inline-flex items-center gap-2 font-medium text-primary text-sm">
              <Sparkles className="size-4" />
              <span>{t('createdBy')}</span>
            </p>
            <div className="space-y-2">
              <h1 className="font-semibold text-3xl tracking-tight">
                {content.title}
              </h1>
              {content.description ? (
                <p className="max-w-3xl text-muted-foreground">
                  {content.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 md:items-end">
            <Link
              href={ctaHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CtaIcon className="size-4" />
              <span>{isOwner ? t('ownerCta') : t('visitorCta')}</span>
            </Link>
            <p className="max-w-xs text-muted-foreground text-xs leading-relaxed md:text-right">
              {isOwner ? t('ownerHelper') : t('visitorHelper')}
            </p>
          </div>
        </header>

        <InteractiveContentPreview
          title={content.title}
          description={content.description}
          html={content.html}
          showSaveToInventory={false}
        />
      </div>
    </main>
  );
}
