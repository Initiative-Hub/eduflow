import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { RoleClient } from './client';

export const metadata: Metadata = {
  title: 'Select Role',
};

interface RoleSelectionPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function RoleSelectionPage({
  params,
}: RoleSelectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoleClient />;
}
