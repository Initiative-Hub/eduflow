import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DictionarySettingsCard } from './_components/dictionary-settings-card';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });
  if (!sessionData) {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <DictionarySettingsCard />
    </section>
  );
}
