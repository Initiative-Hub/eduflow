import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import type { CloudDriveExportArtifact } from '@/services/cloud-drive/cloud-drive-export-types';
import { OneDriveDestinationService } from './OneDriveDestinationService';
import { OneDriveExportError } from './OneDriveExportError';
import type { OneDriveAuthorizedContext } from './OneDriveOAuthTokenService';
import type { OneDriveDestination } from './onedrive-types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const SMALL_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const UPLOAD_SESSION_CHUNK_BYTES = 5 * 1024 * 1024;

type DriveItem = {
  id?: string | null;
  name?: string | null;
  size?: number | null;
  webUrl?: string | null;
  file?: { mimeType?: string | null } | null;
};

type UploadSession = {
  uploadUrl?: string | null;
};

export type OneDriveExportContext = Omit<
  OneDriveAuthorizedContext,
  'destination'
> & {
  destination: OneDriveDestination;
};

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replaceAll(/[\r\n]/g, ' ')
      .replaceAll(/[\\/:*?"<>|]/g, '-')
      .slice(0, 200) || 'export'
  );
}

function encodeGraphId(value: string) {
  return encodeURIComponent(value);
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value).replaceAll('%20', ' ');
}

function toUploadBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer]);
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

function throwExportError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : 'OneDrive request failed.';
  if (message.includes('(403)') || message.includes('(404)')) {
    throw new OneDriveExportError(
      'DRIVE_DESTINATION_UNAVAILABLE',
      'The OneDrive destination is no longer available or writable.'
    );
  }
  throw new OneDriveExportError('DRIVE_UPLOAD_FAILED', message);
}

function getDestinationPath(
  destination: OneDriveDestination,
  fileName: string
) {
  const encodedFileName = encodePathSegment(fileName);
  if (destination.folderId) {
    return `/drives/${encodeGraphId(destination.driveId)}/items/${encodeGraphId(
      destination.folderId
    )}:/${encodedFileName}`;
  }
  return `/drives/${encodeGraphId(destination.driveId)}/root:/${encodedFileName}`;
}

async function uploadSmall(options: {
  artifact: CloudDriveExportArtifact;
  accessToken: string;
  destination: OneDriveDestination;
  fileName: string;
}) {
  try {
    const body = toUploadBlob(options.artifact.bytes);
    const response = await fetch(
      `${GRAPH_BASE_URL}${getDestinationPath(
        options.destination,
        options.fileName
      )}:/content`,
      {
        body,
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': options.artifact.mimeType,
        },
        method: 'PUT',
      }
    );
    return parseGraphJson<DriveItem>(response);
  } catch (error) {
    throwExportError(error);
  }
}

async function createUploadSession(options: {
  accessToken: string;
  destination: OneDriveDestination;
  fileName: string;
}) {
  const response = await fetch(
    `${GRAPH_BASE_URL}${getDestinationPath(
      options.destination,
      options.fileName
    )}:/createUploadSession`,
    {
      body: JSON.stringify({
        item: { '@microsoft.graph.conflictBehavior': 'rename' },
      }),
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
  );
  return parseGraphJson<UploadSession>(response);
}

async function uploadLarge(options: {
  artifact: CloudDriveExportArtifact;
  accessToken: string;
  destination: OneDriveDestination;
  fileName: string;
}) {
  try {
    const session = await createUploadSession(options);
    if (!session.uploadUrl) {
      throw new Error('OneDrive did not return an upload URL.');
    }
    const bytes = options.artifact.bytes;
    let uploaded = 0;
    let latest: DriveItem | null = null;

    while (uploaded < bytes.byteLength) {
      const endExclusive = Math.min(
        uploaded + UPLOAD_SESSION_CHUNK_BYTES,
        bytes.byteLength
      );
      const chunk = bytes.slice(uploaded, endExclusive);
      const body = toUploadBlob(chunk);
      const response = await fetch(session.uploadUrl, {
        body,
        headers: {
          'Content-Length': String(chunk.byteLength),
          'Content-Range': `bytes ${uploaded}-${endExclusive - 1}/${
            bytes.byteLength
          }`,
        },
        method: 'PUT',
      });
      const data = await parseGraphJson<DriveItem>(response);
      latest = data;
      uploaded = endExclusive;
    }

    if (!latest) {
      throw new Error('OneDrive upload did not complete.');
    }
    return latest;
  } catch (error) {
    throwExportError(error);
  }
}

function mapResult(options: {
  destination: OneDriveDestination;
  file: DriveItem;
}) {
  if (!options.file.id) {
    throw new OneDriveExportError(
      'DRIVE_UPLOAD_FAILED',
      'OneDrive did not return an uploaded file ID.'
    );
  }
  return {
    destination: options.destination,
    fileId: options.file.id,
    mimeType: options.file.file?.mimeType ?? 'application/octet-stream',
    name: options.file.name ?? 'export',
    reused: false,
    size: typeof options.file.size === 'number' ? options.file.size : null,
    webViewLink: options.file.webUrl ?? null,
  };
}

export class OneDriveExportService {
  static async uploadArtifact(options: {
    artifact: CloudDriveExportArtifact;
    context?: OneDriveExportContext;
    requestId: string;
    userId: string;
  }) {
    if (options.artifact.bytes.byteLength > STORAGE_MAX_FILE_SIZE_BYTES) {
      throw new OneDriveExportError(
        'EXPORT_TOO_LARGE',
        'OneDrive export exceeds the 50 MB file size limit.'
      );
    }

    const context =
      options.context ??
      (await OneDriveDestinationService.getExportContext(options.userId));
    const fileName = sanitizeFileName(options.artifact.fileName);
    const file =
      options.artifact.bytes.byteLength <= SMALL_UPLOAD_MAX_BYTES
        ? await uploadSmall({
            accessToken: context.accessToken,
            artifact: options.artifact,
            destination: context.destination,
            fileName,
          })
        : await uploadLarge({
            accessToken: context.accessToken,
            artifact: options.artifact,
            destination: context.destination,
            fileName,
          });

    return mapResult({ destination: context.destination, file });
  }
}
