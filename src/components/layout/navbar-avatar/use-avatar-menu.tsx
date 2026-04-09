import { useMutation } from '@tanstack/react-query';
import {
  CheckIcon,
  CircleHelp,
  Globe,
  LogOut,
  MonitorIcon,
  Moon,
  Settings,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import type { MenuItem } from '@/components/custom/dropdown/dropdown.types';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Locale } from '@/i18n/routing';
import { apiClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

interface useAvatarMenuProps {
  name: string;
  email: string;
  role?: string;
}

export function useAvatarMenu({ name, email, role }: useAvatarMenuProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NavbarAvatar');
  const { setTheme, theme } = useTheme();

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
      type: 'custom',
      className: 'px-2 py-3',
      content: (
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-bold text-foreground text-sm leading-none lg:text-base">
              {name || t('fallback.user')}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {email || t('fallback.email')}
            </p>
          </div>
          <Badge variant="outline" className="uppercase">
            {role || t('fallback.role')}
          </Badge>
        </div>
      ),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('menu.profile'),
      icon: <User className="size-5 fill-primary text-primary" />,
      onClick: () => router.push('/profile'),
      className: 'font-bold py-3 px-2',
    },
    {
      type: 'item',
      label: t('menu.settings'),
      icon: <Settings className="size-5 fill-primary text-primary" />,
      onClick: () => router.push('/settings'),
      className: 'font-bold py-3 px-2',
    },
    {
      type: 'item',
      label: t('menu.darkMode'),
      icon: <Moon className="size-5 fill-primary text-primary" />,
      rightNode: (
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
      ),
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      className: 'font-bold py-3 px-2',
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('menu.helpCenter'),
      icon: (
        <CircleHelp className="size-5 fill-primary text-primary-foreground" />
      ),
      onClick: () => router.push('/help'),
      className: 'font-bold py-3 px-2',
    },
    { type: 'separator' },
    {
      type: 'submenu',
      label: t('menu.languagePreference', {
        defaultMessage: 'Language Preference',
      }),
      icon: <Globe className="size-5 text-primary" />,
      className: 'font-bold py-3 px-2',
      items: [
        {
          type: 'item',
          label: t('menu.english', { defaultMessage: 'English' }),
          rightNode: locale === 'en' ? <CheckIcon className="size-4" /> : null,
          onClick: () => updateLocale('en'),
          className: 'font-bold py-2',
        },
        {
          type: 'item',
          label: t('menu.vietnamese', { defaultMessage: 'Tiếng Việt' }),
          rightNode: locale === 'vi' ? <CheckIcon className="size-4" /> : null,
          onClick: () => updateLocale('vi'),
          className: 'font-bold py-2',
        },
        { type: 'separator' },
        {
          type: 'item',
          label: t('menu.system', { defaultMessage: 'System' }),
          icon: <MonitorIcon className="size-4" />,
          onClick: () => clearLocalePreference(),
          className: 'font-bold py-2',
        },
      ],
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('menu.signOut'),
      icon: <LogOut className="size-5 text-destructive" />,
      onClick: handleSignOut,
      destructive: true,
      className: 'font-bold py-3 px-2 text-destructive',
    },
  ];

  return {
    items,
  };
}
