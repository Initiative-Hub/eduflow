import { Cog } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const tLayout = await getTranslations('Layout');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-bold text-3xl text-foreground">
          {tLayout('settingsSystemSettings')}
        </h1>
        <p className="text-muted-foreground">{tLayout('settingsSubheading')}</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Cog className="size-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground text-lg">
            {tLayout('settingsSystemSettings')}
          </h2>
        </div>

        <ul className="space-y-3 text-sm">
          <li>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/profile"
            >
              {tLayout('settingsProfile')}
            </Link>
          </li>
          <li>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/settings/academic-context"
            >
              {tLayout('settingsAcademicContext')}
            </Link>
          </li>
          <li>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/settings/ai-preferences"
            >
              {tLayout('settingsAiPreferences')}
            </Link>
          </li>
          <li>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/settings/integrations"
            >
              {tLayout('settingsIntegrations')}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
