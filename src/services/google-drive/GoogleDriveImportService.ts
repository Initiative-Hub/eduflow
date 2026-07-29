import type { Prisma } from '@/generated/prisma';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';
import { fetchGoogleJson } from './google-drive-http';
import { GoogleDriveOAuthTokenService } from './GoogleDriveOAuthTokenService';
import type { GoogleDriveFileMetadata } from './google-drive-types';

const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_WORKSPACE_EXPORTS: Record<
  string,
  { extension: string; mimeType: string }
> = {
  'application/vnd.google-apps.document': {
    extension: 'pdf',
    mimeType: 'application/pdf',
  },
  'application/vnd.google-apps.drawing': {
    extension: 'png',
    mimeType: 'image/png',
  },
  'application/vnd.google-apps.presentation': {
    extension: 'pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  'application/vnd.google-apps.spreadsheet': {
    extension: 'xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};

function appendExtension(name: string, extension: string) {
  return name.toLowerCase().endsWith(`.${extension}`)
    ? name
    : `${name}.${extension}`;
}

export class GoogleDriveImportService {
  static async importFile(options: {
    courseId?: string | null;
    fileId: string;
    parentId?: string | null;
    userId: string;
  }) {
    const { accessToken } =
      await GoogleDriveOAuthTokenService.getAccessTokenDetails(options.userId);
    const metadataParams = new URLSearchParams({
      fields: 'id,name,mimeType,size,capabilities/canDownload,exportLinks',
      supportsAllDrives: 'true',
    });
    const metadata = await fetchGoogleJson<GoogleDriveFileMetadata>(
      `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(options.fileId)}?${metadataParams}`,
      accessToken
    );
    if (!metadata.name) {
      throw new Error('Selected Google Drive file is missing a name.');
    }
    const exportTarget = metadata.mimeType
      ? GOOGLE_WORKSPACE_EXPORTS[metadata.mimeType]
      : undefined;
    const isWorkspaceFile = Boolean(
      metadata.mimeType?.startsWith('application/vnd.google-apps.')
    );
    if (isWorkspaceFile && !exportTarget) {
      throw new Error('This Google Drive file type cannot be imported yet.');
    }
    if (!isWorkspaceFile && metadata.capabilities?.canDownload === false) {
      throw new Error('This Google Drive file cannot be downloaded.');
    }
    const declaredSize = metadata.size ? Number(metadata.size) : null;
    if (
      declaredSize !== null &&
      Number.isFinite(declaredSize) &&
      declaredSize > STORAGE_MAX_FILE_SIZE_BYTES
    ) {
      throw new Error('File size exceeds storage upload limit');
    }
    const downloadUrl = exportTarget
      ? `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(metadata.id)}/export?${new URLSearchParams({ mimeType: exportTarget.mimeType })}`
      : `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(metadata.id)}?${new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' })}`;
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error('Could not download the selected Google Drive file.');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > STORAGE_MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds storage upload limit');
    }
    const importedAt = new Date().toISOString();
    return StorageService.createFileFromBytes({
      bytes,
      contentType:
        exportTarget?.mimeType ||
        response.headers.get('content-type') ||
        metadata.mimeType ||
        'application/octet-stream',
      courseId: options.courseId ?? null,
      fileName: exportTarget
        ? appendExtension(metadata.name, exportTarget.extension)
        : metadata.name,
      metadata: {
        googleDrive: {
          exportMimeType: exportTarget?.mimeType ?? null,
          fileId: metadata.id,
          mimeType: metadata.mimeType ?? null,
          name: metadata.name,
        },
        importedAt,
        source: 'google_drive',
      } satisfies Prisma.InputJsonValue,
      parentId: options.parentId ?? null,
      userId: options.userId,
    });
  }
}
