import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function POST() {
  return auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  });
}
