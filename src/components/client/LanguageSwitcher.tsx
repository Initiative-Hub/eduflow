'use client';

import { useMutation } from '@tanstack/react-query';
import { CheckIcon, LanguagesIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  const router = useRouter();
  const activeLocale =
    locales.find(({ code }) => code === locale) ?? locales[0];

  const { mutate: updateLocale, isPending } = useMutation({
    mutationFn: async (locale: Locale) => {
      await apiClient.post('/v1/infrastructure/languages', { locale });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-between gap-2"
          disabled={isPending}
        >
          <LanguagesIcon data-icon="inline-start" />
          {activeLocale.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuGroup>
          {locales.map(({ code, label }) => {
            const isActive = code === locale;

            return (
              <DropdownMenuItem
                key={code}
                disabled={isPending}
                className={cn(isActive && 'bg-accent text-accent-foreground')}
                onSelect={() => updateLocale(code)}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span>{label}</span>
                  {isActive ? <CheckIcon /> : null}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
