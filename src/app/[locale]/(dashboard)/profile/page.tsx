import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  return <section>Profile page</section>;
}
