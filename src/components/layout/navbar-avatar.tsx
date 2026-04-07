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

  const trigger = <NavbarAvatarTrigger name={name} image={image} role={role} />;

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

function NavbarAvatarTrigger({ name, image, role }: NavbarAvatarProps) {
  return (
    <div className="mr-2 hidden cursor-pointer items-center gap-3 rounded-full p-1 transition-colors hover:bg-muted/40 md:flex">
      <Avatar className="size-8 cursor-pointer border transition-all hover:ring-2 hover:ring-primary/20">
        <AvatarImage src={image || ''} alt={name || 'User'} />
        <AvatarFallback className="bg-primary/10 font-bold text-primary text-xs">
          {name?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col pr-2">
        <span className="max-w-37 truncate font-semibold text-foreground text-sm">
          {name || 'User'}
        </span>
        <span className="truncate text-muted-foreground text-xs">
          {role || 'User'}
        </span>
      </div>
    </div>
  );
}
