import { supportedLocales } from '@/i18n/routing';

export const APP_AUTH_PATHS = [
  '/login',
  '/register',
  '/verify-otp',
  '/forgot-password',
].reduce((acc: string[], path) => {
  // Add the original path
  acc.push(path);

  // Add localized paths
  const localizedPaths = supportedLocales.map((locale) => `/${locale}${path}`);
  acc.push(...localizedPaths);

  return acc;
}, []);
