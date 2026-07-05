import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import ProfileClient from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ProfilePage');
  return { title: t('title') };
}

export default async function ProfilePage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <ProfileClient />
    </section>
  );
}
