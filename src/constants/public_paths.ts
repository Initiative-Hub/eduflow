import { supportedLocales } from '@/i18n/routing';

export const APP_PUBLIC_PATHS = [
  '/',
  '/docs',
  '/landing',
  '/course',
  '/english',
  '/socratic',
  '/my-posts',
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
