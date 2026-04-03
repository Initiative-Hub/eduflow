import { Library } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';

export default async function StudyHubPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const t = await getTranslations('Layout');

  return (
    <div className="fade-in zoom-in-95 flex min-h-[60vh] animate-in flex-col items-center justify-center gap-4 duration-500">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Library className="size-10" />
      </div>
      <div className="space-y-1 text-center">
        <h1 className="font-bold text-2xl text-foreground tracking-tight">
          {t('studyHub')}
        </h1>
        <p className="text-muted-foreground">
          The Study Hub environment is currently under construction.
        </p>
      </div>
    </div>
  );
}
