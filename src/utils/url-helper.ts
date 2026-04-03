const DEFAULT_REDIRECT_PATH = '/dashboard';
const SANITIZE_BASE_ORIGIN = 'https://redirect.local';
const ABSOLUTE_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    if (charCode <= 0x1f || charCode === 0x7f) {
      return true;
    }
  }

  return false;
}

export function sanitizeNextUrl(
  nextUrl: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH
): string {
  if (typeof nextUrl !== 'string') return fallback;

  const trimmed = nextUrl.trim();
  if (!trimmed) return fallback;
  if (hasControlCharacters(trimmed) || trimmed.includes('\\')) {
    return fallback;
  }
  if (!trimmed.startsWith('/') && !ABSOLUTE_SCHEME_PATTERN.test(trimmed)) {
    return fallback;
  }
  if (trimmed.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, SANITIZE_BASE_ORIGIN);
    if (parsed.origin !== SANITIZE_BASE_ORIGIN) return fallback;

    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!safePath.startsWith('/') || safePath.startsWith('//')) {
      return fallback;
    }

    return safePath || fallback;
  } catch {
    return fallback;
  }
}
