import type * as MicrosoftGraph from '@microsoft/microsoft-graph-types';
import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { OneDriveOAuthTokenService } from './OneDriveOAuthTokenService';
import { resolvePickerTokenTarget } from './OneDriveTokenTarget';
import {
  getPersonalOneDriveRootUrl,
  normalizeOneDriveRootWebViewLink,
  type OneDriveDestination,
  parseOneDriveDestination,
  parseOneDriveMetadata,
} from './onedrive-types';

function encodeGraphId(value: string) {
  return encodeURIComponent(value);
}

function getMyDriveWebViewLink(options: {
  drive: MicrosoftGraph.Drive;
  root: MicrosoftGraph.DriveItem;
}) {
  const rootWebUrl = normalizeOneDriveRootWebViewLink(options.root.webUrl);
  if (rootWebUrl) return rootWebUrl;

  const driveWebUrl = normalizeOneDriveRootWebViewLink(options.drive.webUrl);
  if (driveWebUrl) return driveWebUrl;

  return options.drive.driveType === 'personal'
    ? getPersonalOneDriveRootUrl(options.root.webUrl ?? options.drive.webUrl)
    : null;
}

export class OneDriveDestinationService {
  static async getStatus(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      select: {
        expiresAt: true,
        metadata: true,
        providerAccount: true,
        scope: true,
        tokenCache: true,
        updatedAt: true,
      },
      where: {
        userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
      },
    });
    const metadata = parseOneDriveMetadata(integration?.metadata ?? null);
    const destination = parseOneDriveDestination(metadata);
    let requiresReconnect = Boolean(integration && !integration.tokenCache);
    if (integration && !requiresReconnect) {
      try {
        resolvePickerTokenTarget(metadata);
      } catch {
        requiresReconnect = true;
      }
    }
    return {
      accountEmail: integration?.providerAccount ?? null,
      connected: Boolean(integration),
      destination,
      expiresAt: integration?.expiresAt ?? null,
      metadata: integration?.metadata ?? null,
      requiresReconnect,
      scope: integration?.scope ?? null,
      setupComplete: Boolean(integration && destination && !requiresReconnect),
      updatedAt: integration?.updatedAt ?? null,
    };
  }

  static async getExportContext(userId: string) {
    const context =
      await OneDriveOAuthTokenService.getAuthorizedContext(userId);
    if (!context.destination) {
      throw new Error('OneDrive export destination is not configured.');
    }
    return { ...context, destination: context.destination };
  }

  static async setDestination(
    userId: string,
    input:
      | { kind: 'my_drive' }
      | { driveId: string; folderId: string; kind: 'folder' }
  ): Promise<OneDriveDestination> {
    const context =
      await OneDriveOAuthTokenService.getAuthorizedContext(userId);
    let destination: OneDriveDestination;

    if (input.kind === 'my_drive') {
      const [drive, root] = (await Promise.all([
        context.graph.api('/me/drive').select('id,webUrl,driveType').get(),
        context.graph.api('/me/drive/root').select('id,webUrl').get(),
      ])) as [MicrosoftGraph.Drive, MicrosoftGraph.DriveItem];
      if (!drive.id) {
        throw new Error('OneDrive destination is not available.');
      }
      destination = {
        driveId: drive.id,
        folderId: null,
        kind: 'my_drive',
        name: 'My files',
        webViewLink: getMyDriveWebViewLink({ drive, root }),
      };
    } else {
      const folder = (await context.graph
        .api(
          `/drives/${encodeGraphId(input.driveId)}/items/${encodeGraphId(
            input.folderId
          )}`
        )
        .select('id,name,folder,webUrl')
        .get()
        .catch(() => {
          throw new Error('OneDrive destination is not a writable folder.');
        })) as MicrosoftGraph.DriveItem;
      if (!folder.id || !folder.folder) {
        throw new Error('OneDrive destination is not a writable folder.');
      }
      destination = {
        driveId: input.driveId,
        folderId: folder.id,
        kind: 'folder',
        name: folder.name?.trim() || 'OneDrive folder',
        webViewLink: folder.webUrl ?? null,
      };
    }

    await prisma.connectedIntegration.update({
      data: {
        metadata: { ...parseOneDriveMetadata(context.metadata), destination },
      },
      where: {
        userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
      },
    });
    return destination;
  }
}
