// d:\PROJECTS\demo-app\app\dashboard\account\page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AccountInfoPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Thông tin tài khoản</h1>
      <div className="p-6 bg-white rounded-lg shadow">
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
  )
}
