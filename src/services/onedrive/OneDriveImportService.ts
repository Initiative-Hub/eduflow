import { ResponseType } from '@microsoft/microsoft-graph-client';
import type * as MicrosoftGraph from '@microsoft/microsoft-graph-types';
import type { Prisma } from '@/generated/prisma';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';
import { OneDriveOAuthTokenService } from './OneDriveOAuthTokenService';

function encodeGraphId(value: string) {
  return encodeURIComponent(value);
}

async function readDownloadResponse(response: Response) {
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
    const { graph } = await OneDriveOAuthTokenService.getAuthorizedContext(
      options.userId
    );
    const item = (await graph
      .api(
        `/drives/${encodeGraphId(options.driveId)}/items/${encodeGraphId(
          options.itemId
        )}`
      )
      .select('id,name,size,file,folder,webUrl')
      .get()) as MicrosoftGraph.DriveItem;

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

    const response = (await graph
      .api(
        `/drives/${encodeGraphId(options.driveId)}/items/${encodeGraphId(
          options.itemId
        )}/content`
      )
      .responseType(ResponseType.RAW)
      .get()) as Response;
    const downloaded = await readDownloadResponse(response);
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
