'use client';

import { useMutation } from '@tanstack/react-query';
import { CheckIcon, GlobeIcon, MonitorIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from '@/i18n/navigation';
import { type Locale, supportedLocales } from '@/i18n/routing';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

const locales = supportedLocales.map((code) => ({
  code,
  label: localeLabels[code],
}));

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('LanguageSwitcher');
  const router = useRouter();

  const { mutate: updateLocale, isPending } = useMutation({
    mutationFn: async (locale: Locale) => {
      await apiClient.post('/v1/infrastructure/languages', { locale });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const { mutate: clearLocalePreference, isPending: isClearingPreference } =
    useMutation({
      mutationFn: async () => {
        await apiClient.delete('/v1/infrastructure/languages');
      },
      onSuccess: () => {
        router.refresh();
      },
    });

  const isMutating = isPending || isClearingPreference;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Change language"
          variant="outline"
          size="sm"
          className="size-8 p-0"
          disabled={isMutating}
        >
          <GlobeIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        <DropdownMenuLabel>{t('label')}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {locales.map(({ code, label }) => {
            const isActive = code === locale;

            return (
              <DropdownMenuItem
                key={code}
                disabled={isMutating}
                className={cn(
                  'focus:bg-primary focus:text-primary-foreground focus:**:text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground'
                )}
                onSelect={() => updateLocale(code)}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <GlobeIcon />
                    <span>{label}</span>
                  </span>
                  {isActive ? <CheckIcon /> : null}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isMutating}
          className="focus:bg-primary focus:text-primary-foreground focus:**:text-primary-foreground"
          onSelect={() => clearLocalePreference()}
        >
          <span className="flex items-center gap-2">
            <MonitorIcon />
            <span>{t('system')}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
