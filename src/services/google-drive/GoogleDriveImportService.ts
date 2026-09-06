import type { Readable } from 'node:stream';
import type { Prisma } from '@/generated/prisma';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';
import { GoogleDriveOAuthTokenService } from './GoogleDriveOAuthTokenService';

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

async function readLimitedBytes(stream: Readable) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > STORAGE_MAX_FILE_SIZE_BYTES) {
      stream.destroy();
      throw new Error('File size exceeds storage upload limit');
    }
    chunks.push(bytes);
  }
  return new Uint8Array(Buffer.concat(chunks, size));
}

export class GoogleDriveImportService {
  static async importFile(options: {
    courseId?: string | null;
    fileId: string;
    parentId?: string | null;
    userId: string;
  }) {
    const { drive } = await GoogleDriveOAuthTokenService.getAuthorizedContext(
      options.userId
    );
    const metadata = (
      await drive.files.get({
        fields: 'id,name,mimeType,size,capabilities/canDownload,exportLinks',
        fileId: options.fileId,
        supportsAllDrives: true,
      })
    ).data;
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
    const response = await (async () => {
      try {
        return exportTarget
          ? await drive.files.export(
              { fileId: options.fileId, mimeType: exportTarget.mimeType },
              { responseType: 'stream' }
            )
          : await drive.files.get(
              {
                alt: 'media',
                fileId: options.fileId,
                supportsAllDrives: true,
              },
              { responseType: 'stream' }
            );
      } catch {
        throw new Error('Could not download the selected Google Drive file.');
      }
    })();
    const bytes = await readLimitedBytes(response.data);
    const importedAt = new Date().toISOString();
    return StorageService.createFileFromBytes({
      bytes,
      contentType:
        exportTarget?.mimeType ||
        String(response.headers['content-type'] ?? '') ||
        metadata.mimeType ||
        'application/octet-stream',
      courseId: options.courseId ?? null,
      fileName: exportTarget
        ? appendExtension(metadata.name, exportTarget.extension)
        : metadata.name,
      metadata: {
        googleDrive: {
          exportMimeType: exportTarget?.mimeType ?? null,
          fileId: metadata.id ?? options.fileId,
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
