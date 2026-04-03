import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GraduationCap } from 'lucide-react';

export default async function SocraticTutorPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const t = await getTranslations('Layout');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <GraduationCap className="size-10" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('socraticTutor')}
        </h1>
        <p className="text-muted-foreground">
          This AI workspace is currently under construction.
        </p>
      </div>
    </div>
  );
}
