// d:\PROJECTS\eduflow\components\client\LogoutButton.tsx
'use client';

import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push('/login');
            },
          },
        });
      }}
      className="w-full rounded-md px-4 py-2 text-left hover:bg-gray-700"
    >
      Đăng xuất
    </button>
  );
}
