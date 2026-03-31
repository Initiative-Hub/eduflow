// d:\PROJECTS\eduflow\app\dashboard\layout.tsx
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LogoutButton from '@/components/client/LogoutButton';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const menuItems: { name: string; href: string }[] = [
    { name: 'Trang chủ', href: '/dashboard' },
    // { name: 'Post của tôi', href: '/dashboard/my-posts' },
    { name: 'Account info', href: '/dashboard/account' },
  ];

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  if (user?.role?.name === 'ADMIN') {
    menuItems.push({ name: 'Users', href: '/dashboard/users' });
  }

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100">
      <aside className="flex w-64 flex-col bg-gray-800 text-white">
        <div className="border-gray-700 border-b p-4">
          <h2 className="font-bold text-xl">LMS</h2>
          <p className="text-gray-400 text-sm">{session.user.email}</p>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block rounded-md px-4 py-2 hover:bg-gray-700"
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="border-gray-700 border-t p-4">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
