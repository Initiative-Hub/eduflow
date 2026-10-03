import type { Prisma } from '@/generated/prisma';

export type OneDriveDestination = {
  driveId: string;
  folderId: string | null;
  kind: 'my_drive' | 'folder';
  name: string;
  webViewLink: string | null;
};

export type OneDriveMetadata = {
  accountName?: string | null;
  defaultDriveId?: string | null;
  driveType?: string | null;
  msalHomeAccountId?: string | null;
  msalLocalAccountId?: string | null;
  msalTenantId?: string | null;
  microsoftSubject?: string | null;
  pickerBaseUrl?: string | null;
  destination?: OneDriveDestination | null;
};

function getTrimmedUrl(value?: string | null) {
  return value?.trim() || null;
}

function isOneDriveInternalPersonalContentUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === 'my.microsoftpersonalcontent.com' ||
      host.endsWith('.microsoftpersonalcontent.com')
    );
  } catch {
    return false;
  }
}

function getPersonalContentCid(value?: string | null) {
  if (!value) return null;
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean);
    const personalIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'personal'
    );
    const cid = segments[personalIndex + 1];
    return cid && /^[a-f0-9]{8,32}$/i.test(cid) ? cid : null;
  } catch {
    return null;
  }
}

export function getPersonalOneDriveRootUrl(sourceUrl?: string | null) {
  const url = new URL('https://onedrive.live.com/');
  const cid = getPersonalContentCid(sourceUrl);
  if (cid) {
    url.searchParams.set('id', 'root');
    url.searchParams.set('cid', cid);
  }
  return url.toString();
}

export function normalizeOneDriveRootWebViewLink(value?: string | null) {
  const webViewLink = getTrimmedUrl(value);
  if (!webViewLink) return null;
  return isOneDriveInternalPersonalContentUrl(webViewLink)
    ? getPersonalOneDriveRootUrl(webViewLink)
    : webViewLink;
}

export function parseOneDriveMetadata(
  metadata: Prisma.JsonValue | null
): OneDriveMetadata {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as OneDriveMetadata)
    : {};
}

export function parseOneDriveDestination(
  metadata: Prisma.JsonValue | null
): OneDriveDestination | null {
  const record = parseOneDriveMetadata(metadata);
  const destination = record.destination;
  if (
    !destination ||
    typeof destination !== 'object' ||
    Array.isArray(destination)
  ) {
    return null;
  }

  const kind = destination.kind;
  const driveId = destination.driveId;
  const name = destination.name;
  if (
    (kind !== 'my_drive' && kind !== 'folder') ||
    typeof driveId !== 'string' ||
    typeof name !== 'string'
  ) {
    return null;
  }
  const folderId =
    typeof destination.folderId === 'string' ? destination.folderId : null;
  if (kind === 'folder' && !folderId) return null;
  const webViewLink =
    typeof destination.webViewLink === 'string'
      ? destination.webViewLink
      : null;

  return {
    driveId,
    folderId,
    kind,
    name,
    webViewLink:
      kind === 'my_drive'
        ? normalizeOneDriveRootWebViewLink(webViewLink)
        : getTrimmedUrl(webViewLink),
  };
}
