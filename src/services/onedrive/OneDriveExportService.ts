import type { Client } from '@microsoft/microsoft-graph-client';
import type * as MicrosoftGraph from '@microsoft/microsoft-graph-types';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import type { CloudDriveExportArtifact } from '@/services/cloud-drive/cloud-drive-export-types';
import { OneDriveDestinationService } from './OneDriveDestinationService';
import { OneDriveExportError } from './OneDriveExportError';
import {
  getGraphErrorMessage,
  getGraphErrorStatus,
} from './OneDriveMicrosoftSdkAdapter';
import type { OneDriveAuthorizedContext } from './OneDriveOAuthTokenService';
import type { OneDriveDestination } from './onedrive-types';
import {
  createExportFileName,
  findExistingExport,
  getDestinationPath,
} from './onedrive-export-target';

const SMALL_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const UPLOAD_SESSION_CHUNK_BYTES = 5 * 1024 * 1024;

export type OneDriveExportContext = Omit<
  OneDriveAuthorizedContext,
  'destination'
> & {
  destination: OneDriveDestination;
};

function toUploadBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer]);
}

async function parseUploadSessionJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw Object.assign(
      new Error(
        `Microsoft Graph request failed (${response.status}): ${text || response.statusText}`
      ),
      { statusCode: response.status }
    );
  }
  if (!response.ok) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : text || response.statusText;
    throw Object.assign(
      new Error(
        `Microsoft Graph request failed (${response.status}): ${message}`
      ),
      { statusCode: response.status }
    );
  }
  return data as T;
}

function throwExportError(error: unknown): never {
  const status = getGraphErrorStatus(error);
  const message = getGraphErrorMessage(error);
  if (status === 403 || status === 404) {
    throw new OneDriveExportError(
      'DRIVE_DESTINATION_UNAVAILABLE',
      'The OneDrive destination is no longer available or writable.'
    );
  }
  throw new OneDriveExportError('DRIVE_UPLOAD_FAILED', message);
}

async function uploadSmall(options: {
  artifact: CloudDriveExportArtifact;
  destination: OneDriveDestination;
  fileName: string;
  graph: Client;
}) {
  const body = toUploadBlob(options.artifact.bytes);
  return (await options.graph
    .api(
      `${getDestinationPath(options.destination, options.fileName)}:/content`
    )
    .query({ '@microsoft.graph.conflictBehavior': 'fail' })
    .header('Content-Type', options.artifact.mimeType)
    .put(body)) as MicrosoftGraph.DriveItem;
}

async function createUploadSession(options: {
  destination: OneDriveDestination;
  fileName: string;
  graph: Client;
}) {
  return (await options.graph
    .api(
      `${getDestinationPath(
        options.destination,
        options.fileName
      )}:/createUploadSession`
    )
    .post({
      item: { '@microsoft.graph.conflictBehavior': 'fail' },
    })) as MicrosoftGraph.UploadSession;
}

async function uploadLarge(options: {
  artifact: CloudDriveExportArtifact;
  destination: OneDriveDestination;
  fileName: string;
  graph: Client;
}) {
  const session = await createUploadSession(options);
  if (!session.uploadUrl) {
    throw new Error('OneDrive did not return an upload URL.');
  }
  const bytes = options.artifact.bytes;
  let uploaded = 0;
  let latest: MicrosoftGraph.DriveItem | null = null;

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
    const data =
      await parseUploadSessionJson<MicrosoftGraph.DriveItem>(response);
    latest = data;
    uploaded = endExclusive;
  }

  if (!latest) {
    throw new Error('OneDrive upload did not complete.');
  }
  return latest;
}

function mapResult(options: {
  destination: OneDriveDestination;
  file: MicrosoftGraph.DriveItem;
  reused: boolean;
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
    reused: options.reused,
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
    const fileName = createExportFileName({
      fileName: options.artifact.fileName,
      requestId: options.requestId,
      userId: options.userId,
    });
    const target = {
      destination: context.destination,
      fileName,
      graph: context.graph,
    };
    try {
      const existing = await findExistingExport(target);
      if (existing)
        return mapResult({
          destination: context.destination,
          file: existing,
          reused: true,
        });
      const file =
        options.artifact.bytes.byteLength <= SMALL_UPLOAD_MAX_BYTES
          ? await uploadSmall({
              artifact: options.artifact,
              destination: context.destination,
              fileName,
              graph: context.graph,
            })
          : await uploadLarge({
              artifact: options.artifact,
              destination: context.destination,
              fileName,
              graph: context.graph,
            });

      return mapResult({
        destination: context.destination,
        file,
        reused: false,
      });
    } catch (error) {
      // Recover a concurrent winner or an upload whose success response was lost.
      try {
        const existing = await findExistingExport(target);
        if (existing)
          return mapResult({
            destination: context.destination,
            file: existing,
            reused: true,
          });
      } catch {
        // Preserve the original failure when the recovery lookup also fails.
      }
      throwExportError(error);
    }
  }
}
