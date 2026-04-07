'use client';

import { LogOut, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DropdownTemplate } from '@/components/custom/dropdown/dropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authClient } from '@/lib/auth-client';

interface NavbarAvatarProps {
  name?: string | null;
  image?: string | null;
  role?: string | null;
}

export function NavbarAvatar({ name, image, role }: NavbarAvatarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const trigger = (
    <div className="mr-2 hidden cursor-pointer items-center gap-4 rounded-full px-2 py-1 transition-colors hover:bg-muted/40 md:flex">
      <div className="flex min-w-0 flex-col items-end">
        <span className="max-w-40 truncate font-bold text-base text-foreground leading-tight">
          {name || 'User'}
        </span>
        <span className="truncate font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          {role || 'Student'}
        </span>
      </div>
      <Avatar
        size="lg"
        className="cursor-pointer border-2 border-border transition-all hover:ring-2 hover:ring-primary/20"
      >
        <AvatarImage src={image || ''} alt={name || 'User'} />
        <AvatarFallback className="bg-primary/10 font-bold text-primary text-sm">
          {name?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
    </div>
  );

  const items = [
    {
      label: 'Profile',
      icon: <User className="size-4" />,
      onClick: () => router.push('/profile'),
    },
    {
      label: 'Settings',
      icon: <Settings className="size-4" />,
      onClick: () => router.push('/settings'),
    },
    {
      label: 'Sign out',
      icon: <LogOut className="size-4" />,
      onClick: handleSignOut,
      destructive: true,
    },
  ];

  return <DropdownTemplate trigger={trigger} items={items} align="end" />;
}
