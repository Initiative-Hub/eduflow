import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { UserService } from '@/services/UserService';
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

  const data = await UserService.getProfileData(
    session.user.id,
    session.session.userAgent
  );

  return (
    <section className="space-y-6">
      <ProfileClient
        name={data.basicInfo.name}
        email={data.basicInfo.email}
        image={data.basicInfo.image}
        role={data.basicInfo.role}
        createdAt={new Date(data.basicInfo.createdAt).toISOString()}
        emailVerified={data.basicInfo.emailVerified}
        provider={data.securityInfo.provider}
        hasPassword={data.securityInfo.hasPassword}
        userAgent={data.securityInfo.userAgent}
      />
    </section>
  );
}
