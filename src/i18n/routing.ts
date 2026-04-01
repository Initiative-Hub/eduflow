import { defineRouting } from 'next-intl/routing';

export const defaultLocale = 'en' as const;
export const supportedLocales = ['en', 'vi'] as const;
export type Locale = (typeof supportedLocales)[number];

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: supportedLocales,

  // Used when no locale matches
  defaultLocale,

  localeDetection: true,
  localePrefix: 'never',
});
