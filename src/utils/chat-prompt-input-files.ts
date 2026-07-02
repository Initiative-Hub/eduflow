import type { FileUIPart } from 'ai';

const DATA_URL_PATTERN = /^data:([^;,]+)?((?:;[^,]*)?),(.*)$/;

export function promptFilePartToFile(part: FileUIPart): File | null {
  const match = DATA_URL_PATTERN.exec(part.url);
  if (!match) {
    return null;
  }

  const mediaType = part.mediaType || match[1] || 'application/octet-stream';
  const metadata = match[2] ?? '';
  const payload = match[3] ?? '';
  const binary = metadata.includes(';base64')
    ? atob(payload)
    : decodeURIComponent(payload);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new File([bytes], part.filename ?? 'attachment', {
    type: mediaType,
  });
}

export function promptFilePartsToFiles(parts: FileUIPart[]): File[] {
  return parts.flatMap((part) => {
    const file = promptFilePartToFile(part);
    return file ? [file] : [];
  });
}
