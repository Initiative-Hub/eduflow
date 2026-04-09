import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Academic Context',
};

export default async function AcademicContextPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return <section>Academic Context</section>;
}
