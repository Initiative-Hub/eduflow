import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Account Information',
};

export default async function AccountInfoPage() {
  const t = await getTranslations('AccountPage');
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div>
      <h1 className="mb-6 font-bold text-3xl">{t('title')}</h1>
      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{t('usernameLabel')}</h3>
            <p className="text-muted-foreground">{session.user.name}</p>
          </div>
          <div>
            <h3 className="font-semibold">{t('emailLabel')}</h3>
            <p className="text-muted-foreground">{session.user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
