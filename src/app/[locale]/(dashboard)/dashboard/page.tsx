// d:\PROJECTS\eduflow\app\dashboard\page.tsx

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function DashboardHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome to the Dashboard!</h1>
    </div>
  );
}
