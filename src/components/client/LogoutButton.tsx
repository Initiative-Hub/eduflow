// d:\PROJECTS\demo-app\components\client\LogoutButton.tsx
'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="w-full px-4 py-2 text-left rounded-md hover:bg-gray-700"
    >
      Đăng xuất
    </button>
  )
}
