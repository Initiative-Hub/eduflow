'use client';

import { useTranslations } from 'next-intl';

import { DropdownTemplate } from '@/components/custom/dropdown/dropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavbarAvatarMenu } from './navbar-avatar-menu';

interface NavbarAvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

export function NavbarAvatar({ name, email, image, role }: NavbarAvatarProps) {
  const t = useTranslations('NavbarAvatar');
  const { items } = useNavbarAvatarMenu({ name, email });

  const trigger = (
    <div className="mr-2 hidden cursor-pointer items-center gap-4 rounded-full px-2 py-1 transition-colors hover:bg-muted/40 md:flex">
      <div className="flex min-w-0 flex-col items-end">
        <span className="max-w-40 truncate font-bold text-base text-foreground leading-tight">
          {name || t('fallback.user')}
        </span>
        <span className="truncate font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          {role || t('fallback.role')}
        </span>
      </div>
      <Avatar
        size="lg"
        className="cursor-pointer border-2 border-border transition-all hover:ring-2 hover:ring-primary/20"
      >
        <AvatarImage src={image || ''} alt={name || t('fallback.user')} />
        <AvatarFallback className="bg-primary/10 font-bold text-primary text-sm">
          {name?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
    </div>
  );

  return (
    <DropdownTemplate
      trigger={trigger}
      items={items}
      align="end"
      className="w-72"
    />
  );
}
