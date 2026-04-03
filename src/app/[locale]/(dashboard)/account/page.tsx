// d:\PROJECTS\eduflow\app\dashboard\account\page.tsx
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AccountInfoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div>
      <h1 className="mb-6 font-bold text-3xl">Thông tin tài khoản</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Tên người dùng:</h3>
            <p className="text-gray-700">{session.user.name}</p>
          </div>
          <div>
            <h3 className="font-semibold">Email:</h3>
            <p className="text-gray-700">{session.user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
