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
  microsoftSubject?: string | null;
  pickerBaseUrl?: string | null;
  destination?: OneDriveDestination | null;
};

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

  return {
    driveId,
    folderId,
    kind,
    name,
    webViewLink:
      typeof destination.webViewLink === 'string'
        ? destination.webViewLink
        : null,
  };
}
