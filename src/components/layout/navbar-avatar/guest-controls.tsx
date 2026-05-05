'use client';

import { useMutation } from '@tanstack/react-query';
import { CheckIcon, Globe, MonitorIcon, Moon, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { DropdownTemplate } from '@/components/custom/dropdown/dropdown';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Locale } from '@/i18n/routing';
import { apiClient } from '@/lib/api';

export function GuestControls() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('NavbarAvatar');
  const { setTheme, theme } = useTheme();

  const { mutate: updateLocale } = useMutation({
    mutationFn: async (newLocale: Locale) => {
      await apiClient.post('/v1/infrastructure/languages', {
        locale: newLocale,
      });
    },
    onSuccess: () => router.refresh(),
  });

  const { mutate: clearLocalePreference } = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/v1/infrastructure/languages');
    },
    onSuccess: () => router.refresh(),
  });

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0 rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      aria-label="Guest settings"
      id="guest-controls-trigger"
    >
      <Settings2 className="size-5" />
    </Button>
  );

  const items = [
    {
      type: 'item' as const,
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
    { type: 'separator' as const },
    {
      type: 'submenu' as const,
      label: t('menu.languagePreference', {
        defaultMessage: 'Language Preference',
      }),
      icon: <Globe className="size-5 text-primary" />,
      className: 'font-bold py-3 px-2',
      items: [
        {
          type: 'item' as const,
          label: t('menu.english', { defaultMessage: 'English' }),
          rightNode: locale === 'en' ? <CheckIcon className="size-4" /> : null,
          onClick: () => updateLocale('en'),
          className: 'font-bold py-2',
        },
        {
          type: 'item' as const,
          label: t('menu.vietnamese', { defaultMessage: 'Tiếng Việt' }),
          rightNode: locale === 'vi' ? <CheckIcon className="size-4" /> : null,
          onClick: () => updateLocale('vi'),
          className: 'font-bold py-2',
        },
        { type: 'separator' as const },
        {
          type: 'item' as const,
          label: t('menu.system', { defaultMessage: 'System' }),
          icon: <MonitorIcon className="size-4" />,
          onClick: () => clearLocalePreference(),
          className: 'font-bold py-2',
        },
      ],
    },
  ];

  return (
    <DropdownTemplate
      trigger={trigger}
      items={items}
      align="end"
      className="w-56"
    />
  );
}
