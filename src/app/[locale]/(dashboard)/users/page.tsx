import UsersManager from '@/components/client/UsersManager';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div>
      <UsersManager />
    </div>
  );
}
