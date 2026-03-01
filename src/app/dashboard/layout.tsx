// d:\PROJECTS\demo-app\app\dashboard\layout.tsx
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import LogoutButton from '@/components/client/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const menuItems: { name: string; href: string }[] = [
    { name: 'Trang chủ', href: '/dashboard' },
    // { name: 'Post của tôi', href: '/dashboard/my-posts' },
    { name: 'Account info', href: '/dashboard/account' },
  ]

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  })

  if (user?.role?.name === 'ADMIN') {
    menuItems.push({ name: 'Users', href: '/dashboard/users' })
  }

  return (
    <div className="fixed inset-0 flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">LMS</h2>
          <p className="text-sm text-gray-400">{session.user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block px-4 py-2 rounded-md hover:bg-gray-700"
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  )
}
