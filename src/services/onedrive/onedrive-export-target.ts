import { createHash } from 'node:crypto';
import type { Client } from '@microsoft/microsoft-graph-client';
import type * as MicrosoftGraph from '@microsoft/microsoft-graph-types';
import { getGraphErrorStatus } from './OneDriveMicrosoftSdkAdapter';
import type { OneDriveDestination } from './onedrive-types';

export function createExportFileName(options: {
  fileName: string;
  requestId: string;
  userId: string;
}) {
  const safeName =
    options.fileName
      .trim()
      .replaceAll(/[\r\n]/g, ' ')
      .replaceAll(/[\\/:*?"<>|]/g, '-')
      .replaceAll(/[. ]+$/g, '') || 'export';
  // Persist the request marker in the name in the same operation as the bytes.
  // A separate metadata write would leave a duplication window on failure.
  const marker = createHash('sha256')
    .update(JSON.stringify([options.userId, options.requestId]))
    .digest('hex')
    .slice(0, 32);
  const dot = safeName.lastIndexOf('.');
  const extension = dot > 0 ? safeName.slice(dot).slice(0, 20) : '';
  const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
  return `${stem.slice(0, 200 - marker.length - extension.length - 1)}-${marker}${extension}`;
}

export function getDestinationPath(
  destination: OneDriveDestination,
  fileName: string
) {
  const drive = `/drives/${encodeURIComponent(destination.driveId)}`;
  const parent = destination.folderId
    ? `${drive}/items/${encodeURIComponent(destination.folderId)}`
    : `${drive}/root`;
  return `${parent}:/${encodeURIComponent(fileName)}`;
}

export async function findExistingExport(options: {
  destination: OneDriveDestination;
  fileName: string;
  graph: Client;
}) {
  try {
    const file = (await options.graph
      .api(getDestinationPath(options.destination, options.fileName))
      .select('id,name,size,file,folder,webUrl')
      .get()) as MicrosoftGraph.DriveItem;
    if (!file.id || !file.file || file.folder) {
      throw new Error(
        'The OneDrive export path is occupied by an invalid item.'
      );
    }
    return file;
  } catch (error) {
    if (getGraphErrorStatus(error) === 404) return null;
    throw error;
  }
}
