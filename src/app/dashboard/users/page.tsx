import UsersManager from '@/components/client/UsersManager'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div>
      <UsersManager />
    </div>
  )
}
