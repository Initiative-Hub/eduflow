import type { Auth, drive_v3 } from 'googleapis';
import { GoogleDriveExportError } from './GoogleDriveExportError';
import type { GoogleDriveExportArtifact } from './GoogleDriveExportService';
import type { GoogleDriveDestination } from './google-drive-types';

const GOOGLE_DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files';
const RESUMABLE_MAX_ATTEMPTS = 4;

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

function getNextUploadOffset(response: Response) {
  const range = response.headers.get('range');
  const match = range?.match(/bytes=0-(\d+)/i);
  return match ? Number(match[1]) + 1 : 0;
}

export async function uploadGoogleDriveResumable(options: {
  artifact: GoogleDriveExportArtifact;
  auth: Auth.OAuth2Client;
  destination: GoogleDriveDestination;
  requestId: string;
}): Promise<drive_v3.Schema$File> {
  const metadata: drive_v3.Schema$File = {
    appProperties: {
      eduflow_export_request_id: options.requestId,
      eduflow_export_source: options.artifact.sourceKind,
    },
    name:
      options.artifact.fileName
        .trim()
        .replaceAll(/[\r\n]/g, ' ')
        .slice(0, 200) || 'export',
    ...(options.destination.folderId
      ? { parents: [options.destination.folderId] }
      : {}),
  };
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,webViewLink',
    supportsAllDrives: 'true',
    uploadType: 'resumable',
  });
  const sessionUrl = `${GOOGLE_DRIVE_UPLOAD_URL}?${params}`;
  const authHeaders = await options.auth.getRequestHeaders(sessionUrl);
  const sessionResponse = await fetch(sessionUrl, {
    body: JSON.stringify(metadata),
    headers: {
      ...Object.fromEntries(authHeaders.entries()),
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(options.artifact.bytes.byteLength),
      'X-Upload-Content-Type': options.artifact.mimeType,
    },
    method: 'POST',
  });
  if (!sessionResponse.ok) await readDriveJson(sessionResponse);

  const uploadUrl = sessionResponse.headers.get('location');
  if (!uploadUrl) {
    throw new GoogleDriveExportError(
      'DRIVE_UPLOAD_FAILED',
      'Google Drive did not return a resumable upload session.'
    );
  }

  let offset = 0;
  for (let attempt = 0; attempt < RESUMABLE_MAX_ATTEMPTS; attempt += 1) {
    const remaining = options.artifact.bytes.slice(offset);
    const uploadResponse = await fetch(uploadUrl, {
      body: remaining,
      headers: {
        'Content-Length': String(remaining.byteLength),
        'Content-Range': `bytes ${offset}-${options.artifact.bytes.byteLength - 1}/${options.artifact.bytes.byteLength}`,
        'Content-Type': options.artifact.mimeType,
      },
      method: 'PUT',
    });
    if (uploadResponse.ok) {
      return readDriveJson<drive_v3.Schema$File>(uploadResponse);
    }
    if (uploadResponse.status === 308) {
      offset = getNextUploadOffset(uploadResponse);
      continue;
    }
    if (uploadResponse.status >= 500) {
      const statusResponse = await fetch(uploadUrl, {
        headers: {
          'Content-Length': '0',
          'Content-Range': `bytes */${options.artifact.bytes.byteLength}`,
        },
        method: 'PUT',
      });
      if (statusResponse.ok) {
        return readDriveJson<drive_v3.Schema$File>(statusResponse);
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
