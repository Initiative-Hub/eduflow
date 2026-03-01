// d:\PROJECTS\demo-app\app\dashboard\page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function DashboardHomePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div>
      <h1>Welcome to the Dashboard!</h1>
    </div>
  )
}
