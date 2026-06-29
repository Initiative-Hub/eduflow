import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AIClient } from './_components/ai-client';

export default async function HomePage() {
  const sessionData = await auth.api.getSession({ headers: await headers() });

  return (
    <AIClient
      isAuthenticated={Boolean(sessionData)}
      userName={sessionData?.user?.name}
    />
  );
}
