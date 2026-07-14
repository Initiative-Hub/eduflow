import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import InteractiveContentPreview from '@/app/[locale]/(dashboard)/study/_components/interactive-content-preview';
import { auth } from '@/lib/auth';
import { StudyShareService } from '@/services/StudyShareService';
import { SharedInteractiveContentHeader } from '../_components/shared-interactive-content-header';

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

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <SharedInteractiveContentHeader
          content={content}
          ctaHref={ctaHref}
          isOwner={isOwner}
          t={t}
        />

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
