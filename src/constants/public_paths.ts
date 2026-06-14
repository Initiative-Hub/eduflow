import { supportedLocales } from '@/i18n/routing';

export const APP_PUBLIC_PATHS = [
  '/',
  '/api-docs',
  '/chat',
  '/landing',
  '/course',
  '/english',
  '/socratic',
  '/study',
  '/writing',
].reduce((acc: string[], path) => {
  // Add the original path
  acc.push(path);

  // Add localized paths
  const localizedPaths = supportedLocales.map((locale) =>
    path === '/' ? `/${locale}` : `/${locale}${path}`
  );
  acc.push(...localizedPaths);

  return acc;
}, []);
