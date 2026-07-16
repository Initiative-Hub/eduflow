import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { SharedLinksClient } from './shared-links-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AiShareLinks');

  return { title: t('title') };
}

export default async function SharedLinksPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });

  if (!sessionData) {
    redirect('/login');
  }

  const t = await getTranslations('AiShareLinks');

  return (
    <section className="space-y-6">
      <div className="fade-in animate-in duration-300">
        <h1 className="font-bold text-2xl text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <SharedLinksClient />
    </section>
  );
}
