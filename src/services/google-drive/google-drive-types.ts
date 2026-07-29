import type { Prisma } from '@/generated/prisma';

export type GoogleDriveDestination = {
  driveId: string | null;
  folderId: string | null;
  kind: 'my_drive' | 'folder';
  name: string;
  webViewLink: string | null;
};

export type GoogleDriveFileMetadata = {
  capabilities?: {
    canAddChildren?: boolean;
    canDownload?: boolean;
  };
  driveId?: string;
  exportLinks?: Record<string, string>;
  id: string;
  mimeType?: string;
  name?: string;
  size?: string;
  trashed?: boolean;
  webViewLink?: string;
};

export function parseGoogleDriveDestination(
  metadata: Prisma.JsonValue | null
): GoogleDriveDestination | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const destination = metadata.destination;
  if (
    !destination ||
    typeof destination !== 'object' ||
    Array.isArray(destination)
  ) {
    return null;
  }
  const kind = destination.kind;
  const name = destination.name;
  if ((kind !== 'my_drive' && kind !== 'folder') || typeof name !== 'string') {
    return null;
  }
  const folderId =
    typeof destination.folderId === 'string' ? destination.folderId : null;
  if (kind === 'folder' && !folderId) return null;

  return {
    driveId:
      typeof destination.driveId === 'string' ? destination.driveId : null,
    folderId,
    kind,
    name,
    webViewLink:
      typeof destination.webViewLink === 'string'
        ? destination.webViewLink
        : null,
  };
}

export function getGoogleDriveMetadataRecord(
  metadata: Prisma.JsonValue | null
) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
}
