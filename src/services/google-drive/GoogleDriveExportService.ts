import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { GoogleDriveDestinationService } from './GoogleDriveDestinationService';
import { GoogleDriveExportError } from './GoogleDriveExportError';
import type { GoogleDriveDestination } from './google-drive-types';

const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files';
const MULTIPART_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const RESUMABLE_MAX_ATTEMPTS = 4;

export type GoogleDriveExportArtifact = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  sourceKind: string;
};

type GoogleDriveUploadedFile = {
  id: string;
  mimeType?: string;
  name?: string;
  size?: string;
  webViewLink?: string;
};

type GoogleDriveFileList = {
  files?: GoogleDriveUploadedFile[];
};

async function readDriveJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !data) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? JSON.stringify(data.error)
        : 'Google Drive request failed.';
    if (response.status === 403 || response.status === 404) {
      throw new GoogleDriveExportError(
        'DRIVE_DESTINATION_UNAVAILABLE',
        'The Google Drive destination is no longer available or writable.'
      );
    }
    throw new GoogleDriveExportError('DRIVE_UPLOAD_FAILED', message);
  }
  return data;
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replaceAll(/[\r\n]/g, ' ')
      .slice(0, 200) || 'export'
  );
}

function mapResult(options: {
  destination: GoogleDriveDestination;
  file: GoogleDriveUploadedFile;
  reused: boolean;
}) {
  return {
    destination: options.destination,
    fileId: options.file.id,
    mimeType: options.file.mimeType ?? 'application/octet-stream',
    name: options.file.name ?? 'export',
    reused: options.reused,
    size: options.file.size ? Number(options.file.size) : null,
    webViewLink: options.file.webViewLink ?? null,
  };
}

async function findExistingExport(options: {
  accessToken: string;
  destination: GoogleDriveDestination;
  requestId: string;
}) {
  const query = `trashed = false and appProperties has { key='eduflow_export_request_id' and value='${options.requestId}' }`;
  const params = new URLSearchParams({
    fields: 'files(id,name,mimeType,size,webViewLink)',
    includeItemsFromAllDrives: 'true',
    pageSize: '1',
    q: query,
    spaces: 'drive',
    supportsAllDrives: 'true',
  });
  if (options.destination.driveId) {
    params.set('corpora', 'drive');
    params.set('driveId', options.destination.driveId);
  }
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}?${params}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${options.accessToken}`,
    },
  });
  const result = await readDriveJson<GoogleDriveFileList>(response);
  return result.files?.[0] ?? null;
}

async function uploadMultipart(options: {
  accessToken: string;
  artifact: GoogleDriveExportArtifact;
  destination: GoogleDriveDestination;
  requestId: string;
}) {
  const boundary = `eduflow_${crypto.randomUUID()}`;
  const metadata = {
    appProperties: {
      eduflow_export_request_id: options.requestId,
      eduflow_export_source: options.artifact.sourceKind,
    },
    name: sanitizeFileName(options.artifact.fileName),
    ...(options.destination.folderId
      ? { parents: [options.destination.folderId] }
      : {}),
  };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${options.artifact.mimeType}\r\n\r\n`,
    Uint8Array.from(options.artifact.bytes),
    `\r\n--${boundary}--`,
  ]);
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,webViewLink',
    supportsAllDrives: 'true',
    uploadType: 'multipart',
  });
  const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_URL}?${params}`, {
    body,
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    method: 'POST',
  });
  return readDriveJson<GoogleDriveUploadedFile>(response);
}

function getNextUploadOffset(response: Response) {
  const range = response.headers.get('range');
  const match = range?.match(/bytes=0-(\d+)/i);
  return match ? Number(match[1]) + 1 : 0;
}

async function uploadResumable(options: {
  accessToken: string;
  artifact: GoogleDriveExportArtifact;
  destination: GoogleDriveDestination;
  requestId: string;
}) {
  const metadata = {
    appProperties: {
      eduflow_export_request_id: options.requestId,
      eduflow_export_source: options.artifact.sourceKind,
    },
    name: sanitizeFileName(options.artifact.fileName),
    ...(options.destination.folderId
      ? { parents: [options.destination.folderId] }
      : {}),
  };
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,webViewLink',
    supportsAllDrives: 'true',
    uploadType: 'resumable',
  });
  const sessionResponse = await fetch(`${GOOGLE_DRIVE_UPLOAD_URL}?${params}`, {
    body: JSON.stringify(metadata),
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(options.artifact.bytes.byteLength),
      'X-Upload-Content-Type': options.artifact.mimeType,
    },
    method: 'POST',
  });
  if (!sessionResponse.ok) {
    await readDriveJson(sessionResponse);
  }
  const sessionUrl = sessionResponse.headers.get('location');
  if (!sessionUrl) {
    throw new GoogleDriveExportError(
      'DRIVE_UPLOAD_FAILED',
      'Google Drive did not return a resumable upload session.'
    );
  }

  let offset = 0;
  for (let attempt = 0; attempt < RESUMABLE_MAX_ATTEMPTS; attempt += 1) {
    const remaining = options.artifact.bytes.slice(offset);
    const uploadResponse = await fetch(sessionUrl, {
      body: remaining,
      headers: {
        'Content-Length': String(remaining.byteLength),
        'Content-Range': `bytes ${offset}-${options.artifact.bytes.byteLength - 1}/${options.artifact.bytes.byteLength}`,
        'Content-Type': options.artifact.mimeType,
      },
      method: 'PUT',
    });

    if (uploadResponse.ok) {
      return readDriveJson<GoogleDriveUploadedFile>(uploadResponse);
    }
    if (uploadResponse.status === 308) {
      offset = getNextUploadOffset(uploadResponse);
      continue;
    }
    if (uploadResponse.status >= 500) {
      const statusResponse = await fetch(sessionUrl, {
        headers: {
          'Content-Length': '0',
          'Content-Range': `bytes */${options.artifact.bytes.byteLength}`,
        },
        method: 'PUT',
      });
      if (statusResponse.ok) {
        return readDriveJson<GoogleDriveUploadedFile>(statusResponse);
      }
      if (statusResponse.status === 308) {
        offset = getNextUploadOffset(statusResponse);
        continue;
      }
    }

    await readDriveJson(uploadResponse);
  }

  throw new GoogleDriveExportError(
    'DRIVE_UPLOAD_FAILED',
    'Google Drive resumable upload did not complete.'
  );
}

export type GoogleDriveExportContext = {
  accessToken: string;
  destination: GoogleDriveDestination;
};

export class GoogleDriveExportService {
  static async uploadArtifact(options: {
    artifact: GoogleDriveExportArtifact;
    context?: GoogleDriveExportContext;
    requestId: string;
    userId: string;
  }) {
    if (options.artifact.bytes.byteLength > STORAGE_MAX_FILE_SIZE_BYTES) {
      throw new GoogleDriveExportError(
        'EXPORT_TOO_LARGE',
        'Google Drive export exceeds the 50 MB file size limit.'
      );
    }

    const { accessToken, destination } =
      options.context ??
      (await GoogleDriveDestinationService.getExportContext(options.userId));
    const existing = await findExistingExport({
      accessToken,
      destination,
      requestId: options.requestId,
    });
    if (existing) {
      return mapResult({ destination, file: existing, reused: true });
    }

    const uploadOptions = {
      accessToken,
      artifact: options.artifact,
      destination,
      requestId: options.requestId,
    };
    const file =
      options.artifact.bytes.byteLength <= MULTIPART_UPLOAD_MAX_BYTES
        ? await uploadMultipart(uploadOptions)
        : await uploadResumable(uploadOptions);
    return mapResult({ destination, file, reused: false });
  }
}
