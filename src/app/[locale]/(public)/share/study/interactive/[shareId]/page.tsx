import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import InteractiveContentPreview from '@/app/[locale]/(dashboard)/study/_components/interactive-content-preview';
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
    title: content ? `${content.title} | EduFlow` : 'Shared Activity',
  };
}

export default async function SharedInteractiveContentPage({
  params,
}: SharedInteractiveContentPageProps) {
  const [{ shareId }, t] = await Promise.all([
    params,
    getTranslations('StudyPage.sharedInteractiveContent'),
  ]);

  const content = await StudyShareService.getPublicInteractiveContent(shareId);

  if (!content) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <p className="font-medium text-primary text-sm">{t('eyebrow')}</p>
          <h1 className="font-semibold text-3xl tracking-tight">
            {content.title}
          </h1>
          {content.description ? (
            <p className="max-w-3xl text-muted-foreground">
              {content.description}
            </p>
          ) : null}
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
