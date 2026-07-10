import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import AiPreferencesClient from './client';

export const metadata: Metadata = {
  title: 'AI Preferences',
};

export default async function AiPreferencesPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  const t = await getTranslations('ProfilePage.aiPreferences');

  return (
    <section className="space-y-6">
      <div className="fade-in animate-in duration-300">
        <h1 className="font-bold text-2xl text-foreground tracking-tight">
          {t('title')}
        </h1>
      </div>
      <AiPreferencesClient />
    </section>
  );
}
