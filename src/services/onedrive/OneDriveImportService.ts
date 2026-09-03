import type { Prisma } from '@/generated/prisma';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';
import { OneDriveOAuthTokenService } from './OneDriveOAuthTokenService';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

type DriveItem = {
  file?: { mimeType?: string | null } | null;
  folder?: Record<string, unknown> | null;
  id?: string | null;
  name?: string | null;
  size?: number | null;
  webUrl?: string | null;
};

function encodeGraphId(value: string) {
  return encodeURIComponent(value);
}

async function parseGraphJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message =
      typeof data.error?.message === 'string'
        ? data.error.message
        : text || response.statusText;
    throw new Error(
      `Microsoft Graph request failed (${response.status}): ${message}`
    );
  }
  return data as T;
}

async function graphGet<T>(accessToken: string, path: string) {
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseGraphJson<T>(response);
}

async function graphBytes(accessToken: string, path: string) {
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Microsoft Graph download failed (${response.status}): ${
        message || response.statusText
      }`
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > STORAGE_MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds storage upload limit');
  }
  return {
    bytes,
    contentType:
      response.headers.get('content-type') || 'application/octet-stream',
  };
}

export class OneDriveImportService {
  static async importFile(options: {
    courseId?: string | null;
    driveId: string;
    itemId: string;
    parentId?: string | null;
    userId: string;
  }) {
    const { accessToken } =
      await OneDriveOAuthTokenService.getAuthorizedContext(options.userId);
    const item = await graphGet<DriveItem>(
      accessToken,
      `/drives/${encodeGraphId(options.driveId)}/items/${encodeGraphId(
        options.itemId
      )}?$select=id,name,size,file,folder,webUrl`
    );

    if (!item.name) {
      throw new Error('Selected OneDrive file is missing a name.');
    }
    if (item.folder || !item.file) {
      throw new Error('This OneDrive item cannot be downloaded.');
    }
    if (
      typeof item.size === 'number' &&
      item.size > STORAGE_MAX_FILE_SIZE_BYTES
    ) {
      throw new Error('File size exceeds storage upload limit');
    }

    const downloaded = await graphBytes(
      accessToken,
      `/drives/${encodeGraphId(options.driveId)}/items/${encodeGraphId(
        options.itemId
      )}/content`
    );
    const importedAt = new Date().toISOString();
    return StorageService.createFileFromBytes({
      bytes: downloaded.bytes,
      contentType:
        item.file.mimeType ||
        downloaded.contentType ||
        'application/octet-stream',
      courseId: options.courseId ?? null,
      fileName: item.name,
      metadata: {
        importedAt,
        oneDrive: {
          driveId: options.driveId,
          itemId: item.id ?? options.itemId,
          mimeType: item.file.mimeType ?? null,
          name: item.name,
          webUrl: item.webUrl ?? null,
        },
        source: 'onedrive',
      } satisfies Prisma.InputJsonValue,
      parentId: options.parentId ?? null,
      userId: options.userId,
    });
  }
}
