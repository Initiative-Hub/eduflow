export function isPathMatched(pathname: string, paths: string[]): boolean {
  console.log(pathname, paths);
  return paths.some((path) => {
    if (path === '/') return pathname === '/';

    return pathname === path || pathname.startsWith(`${path}/`);
  });
}
