import { useMutation } from '@tanstack/react-query';
import {
  CheckIcon,
  Globe,
  LogOut,
  MonitorIcon,
  Settings,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import type { MenuItem } from '@/components/custom/dropdown/dropdown.types';
import type { Locale } from '@/i18n/routing';
import { apiClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export function useNavbarAvatarMenu() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NavbarAvatar');

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const { mutate: updateLocale } = useMutation({
    mutationFn: async (newLocale: Locale) => {
      await apiClient.post('/v1/infrastructure/languages', {
        locale: newLocale,
      });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const { mutate: clearLocalePreference } = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/v1/infrastructure/languages');
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const items: MenuItem[] = [
    {
      type: 'item',
      label: t('menu.profile'),
      icon: <User className="size-4" />,
      onClick: () => router.push('/profile'),
    },
    {
      type: 'item',
      label: t('menu.settings'),
      icon: <Settings className="size-4" />,
      onClick: () => router.push('/settings'),
    },
    {
      type: 'separator',
    },
    {
      type: 'submenu',
      label: t('menu.language'),
      icon: <Globe className="size-4" />,
      items: [
        {
          type: 'item',
          label: t('menu.english'),
          rightNode: locale === 'en' ? <CheckIcon className="size-4" /> : null,
          onClick: () => updateLocale('en'),
        },
        {
          type: 'item',
          label: t('menu.vietnamese'),
          rightNode: locale === 'vi' ? <CheckIcon className="size-4" /> : null,
          onClick: () => updateLocale('vi'),
        },
        {
          type: 'separator',
        },
        {
          type: 'item',
          label: t('menu.system'),
          icon: <MonitorIcon className="size-4" />,
          onClick: () => clearLocalePreference(),
        },
      ],
    },
    {
      type: 'separator',
    },
    {
      type: 'item',
      label: t('menu.signOut'),
      icon: <LogOut className="size-4" />,
      onClick: handleSignOut,
      destructive: true,
    },
  ];

  return {
    items,
  };
}
