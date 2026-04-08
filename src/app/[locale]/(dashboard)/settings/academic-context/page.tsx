import { School } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Academic Context',
};

export default async function AcademicContextPage() {
  const tCommon = await getTranslations('Common');
  const tLayout = await getTranslations('Layout');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-bold text-3xl text-foreground">
          {tLayout('settingsAcademicContext')}
        </h1>
        <p className="text-muted-foreground">{tLayout('settingsSubheading')}</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <School className="size-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground text-lg">
            {tLayout('settingsAcademicContext')}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">{tCommon('comingSoon')}</p>
      </div>
    </section>
  );
}
