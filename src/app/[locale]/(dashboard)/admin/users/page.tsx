import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AdminUsersClient from './client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminUsersPage');
  return { title: t('title') };
}

export default async function AdminUsersPage() {
  return <AdminUsersClient />;
}
