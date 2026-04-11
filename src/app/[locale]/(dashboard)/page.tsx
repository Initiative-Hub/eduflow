import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { AIClient } from './_components/ai-client';

export default async function HomePage() {
  const t = await getTranslations('Layout');
  const session = await auth.api.getSession({ headers: await headers() });

  // if (!session?.user) {
  //   redirect('/landing');
  // }

  return (
    <div className="flex flex-1 flex-col">
      <AIClient userName={session?.user?.name} />
    </div>
  );
}
