import { supportedLocales } from '@/i18n/routing';

export function isPathMatched(pathname: string, paths: string[]): boolean {
  // Normalize pathname: remove trailing slash except for root
  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;

  return paths.some((path) => {
    // Normalize path
    const normalizedPath =
      path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

    if (
      normalizedPath === '/' ||
      supportedLocales.some((locale) => normalizedPath === `/${locale}`)
    ) {
      return normalizedPathname === normalizedPath;
    }

    return (
      normalizedPathname === normalizedPath ||
      normalizedPathname.startsWith(`${normalizedPath}/`)
    );
  });
}
