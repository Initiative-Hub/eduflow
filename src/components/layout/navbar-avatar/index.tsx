'use client';

import { useTranslations } from 'next-intl';

import { DropdownTemplate } from '@/components/custom/dropdown/dropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarMenu } from './use-avatar-menu';

interface NavbarAvatarProps {
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

export function NavbarAvatar({ name, email, image, role }: NavbarAvatarProps) {
  const t = useTranslations('NavbarAvatar');
  const { items } = useAvatarMenu({ name, email, role });

  const trigger = (
    <div className="flex cursor-pointer items-center gap-4 rounded-lg px-2 py-1 transition-colors hover:bg-muted">
      <div className="hidden min-w-0 flex-col items-end md:flex">
        <span className="max-w-40 truncate font-bold text-base text-foreground leading-tight">
          {name || t('fallback.user')}
        </span>
        <span className="truncate font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          {role || t('fallback.role')}
        </span>
      </div>

      <Avatar size="lg" className="cursor-pointer border-2 border-border">
        <AvatarImage src={image || ''} alt={name || t('fallback.user')} />
        <AvatarFallback className="bg-primary/10 font-bold text-primary text-sm">
          {name?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col md:hidden">
        <span className="truncate font-semibold text-foreground text-sm">
          {name || t('fallback.user')}
        </span>
        <span className="text-muted-foreground text-xs">
          {email || t('fallback.email')}
        </span>
      </div>
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
