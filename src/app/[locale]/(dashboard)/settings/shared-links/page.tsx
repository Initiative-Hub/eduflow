import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Link2 } from 'lucide-react';
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
      <div className="fade-in animate-in space-y-2 duration-300">
        <div className="flex items-center gap-2 font-medium text-primary text-xs uppercase tracking-[0.18em]">
          <Link2 className="size-3.5" />
          {t('eyebrow')}
        </div>
        <h1 className="font-bold text-2xl text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-muted-foreground text-sm leading-6">
          {t('description')}
        </p>
      </div>

      <SharedLinksClient />
    </section>
  );
}
