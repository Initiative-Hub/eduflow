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

export function sanitizeUrl(url: string | null): string | null {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (hasControlCharacters(trimmed) || trimmed.includes('\\')) {
    return null;
  }
  if (!trimmed.startsWith('/') && !ABSOLUTE_SCHEME_PATTERN.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, SANITIZE_BASE_ORIGIN);
    if (parsed.origin !== SANITIZE_BASE_ORIGIN) return null;

    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!safePath.startsWith('/') || safePath.startsWith('//')) {
      return null;
    }

    return safePath;
  } catch {
    return null;
  }
}
