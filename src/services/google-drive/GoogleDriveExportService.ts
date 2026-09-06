import { Readable } from 'node:stream';
import type { drive_v3 } from 'googleapis';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { GoogleDriveDestinationService } from './GoogleDriveDestinationService';
import { GoogleDriveExportError } from './GoogleDriveExportError';
import type { GoogleDriveAuthorizedContext } from './GoogleDriveOAuthTokenService';
import { uploadGoogleDriveResumable } from './google-drive-resumable-upload';
import type { GoogleDriveDestination } from './google-drive-types';

const MULTIPART_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export type GoogleDriveExportArtifact = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  sourceKind: string;
};

export type GoogleDriveExportContext = Omit<
  GoogleDriveAuthorizedContext,
  'destination'
> & {
  destination: GoogleDriveDestination;
};

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replaceAll(/[\r\n]/g, ' ')
      .slice(0, 200) || 'export'
  );
}

function getGoogleErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error))
    return null;
  const response = error.response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return null;
  }
  return typeof response.status === 'number' ? response.status : null;
}

function getGoogleErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Google Drive request failed.';
}

function throwExportError(error: unknown): never {
  const status = getGoogleErrorStatus(error);
  if (status === 403 || status === 404) {
    throw new GoogleDriveExportError(
      'DRIVE_DESTINATION_UNAVAILABLE',
      'The Google Drive destination is no longer available or writable.'
    );
  }
  throw new GoogleDriveExportError(
    'DRIVE_UPLOAD_FAILED',
    getGoogleErrorMessage(error)
  );
}

function mapResult(options: {
  destination: GoogleDriveDestination;
  file: drive_v3.Schema$File;
  reused: boolean;
}) {
  if (!options.file.id) {
    throw new GoogleDriveExportError(
      'DRIVE_UPLOAD_FAILED',
      'Google Drive did not return an uploaded file ID.'
    );
  }
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
  context: GoogleDriveExportContext;
  requestId: string;
}) {
  const query = `trashed = false and appProperties has { key='eduflow_export_request_id' and value='${options.requestId}' }`;
  try {
    const response = await options.context.drive.files.list({
      ...(options.context.destination.driveId
        ? {
            corpora: 'drive',
            driveId: options.context.destination.driveId,
          }
        : {}),
      fields: 'files(id,name,mimeType,size,webViewLink)',
      includeItemsFromAllDrives: true,
      pageSize: 1,
      q: query,
      spaces: 'drive',
      supportsAllDrives: true,
    });
    return response.data.files?.[0] ?? null;
  } catch (error) {
    throwExportError(error);
  }
}

function createFileMetadata(options: {
  artifact: GoogleDriveExportArtifact;
  destination: GoogleDriveDestination;
  requestId: string;
}): drive_v3.Schema$File {
  return {
    appProperties: {
      eduflow_export_request_id: options.requestId,
      eduflow_export_source: options.artifact.sourceKind,
    },
    name: sanitizeFileName(options.artifact.fileName),
    ...(options.destination.folderId
      ? { parents: [options.destination.folderId] }
      : {}),
  };
}

async function uploadMultipart(options: {
  artifact: GoogleDriveExportArtifact;
  context: GoogleDriveExportContext;
  requestId: string;
}) {
  try {
    return (
      await options.context.drive.files.create({
        fields: 'id,name,mimeType,size,webViewLink',
        media: {
          body: Readable.from(Buffer.from(options.artifact.bytes)),
          mimeType: options.artifact.mimeType,
        },
        requestBody: createFileMetadata({
          artifact: options.artifact,
          destination: options.context.destination,
          requestId: options.requestId,
        }),
        supportsAllDrives: true,
      })
    ).data;
  } catch (error) {
    throwExportError(error);
  }
}

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

    const context =
      options.context ??
      (await GoogleDriveDestinationService.getExportContext(options.userId));
    const existing = await findExistingExport({
      context,
      requestId: options.requestId,
    });
    if (existing) {
      return mapResult({
        destination: context.destination,
        file: existing,
        reused: true,
      });
    }

    const file =
      options.artifact.bytes.byteLength <= MULTIPART_UPLOAD_MAX_BYTES
        ? await uploadMultipart({
            artifact: options.artifact,
            context,
            requestId: options.requestId,
          })
        : await uploadGoogleDriveResumable({
            artifact: options.artifact,
            auth: context.auth,
            destination: context.destination,
            requestId: options.requestId,
          });
    return mapResult({ destination: context.destination, file, reused: false });
  }
}
