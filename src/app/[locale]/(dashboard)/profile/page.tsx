import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { ProfileClient } from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ProfilePage');
  return { title: t('title') };
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
    createdAt: Date;
    emailVerified: boolean;
  };

  return (
    <section className="space-y-6">
      <ProfileClient
        name={user.name}
        email={user.email}
        image={user.image}
        role={user.role}
        createdAt={user.createdAt.toISOString()}
        emailVerified={user.emailVerified}
      />
    </section>
  );
}
