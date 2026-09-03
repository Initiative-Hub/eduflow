import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { OneDriveOAuthTokenService } from './OneDriveOAuthTokenService';
import {
  type OneDriveDestination,
  parseOneDriveDestination,
  parseOneDriveMetadata,
} from './onedrive-types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

type DriveItem = {
  folder?: Record<string, unknown> | null;
  id?: string | null;
  name?: string | null;
  webUrl?: string | null;
};

type Drive = {
  id?: string | null;
  webUrl?: string | null;
};

async function graphGet<T>(accessToken: string, path: string) {
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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

function encodeGraphId(value: string) {
  return encodeURIComponent(value);
}

export class OneDriveDestinationService {
  static async getStatus(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      select: {
        expiresAt: true,
        metadata: true,
        providerAccount: true,
        scope: true,
        updatedAt: true,
      },
      where: {
        userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
      },
    });
    const destination = parseOneDriveDestination(integration?.metadata ?? null);
    return {
      accountEmail: integration?.providerAccount ?? null,
      connected: Boolean(integration),
      destination,
      expiresAt: integration?.expiresAt ?? null,
      metadata: integration?.metadata ?? null,
      scope: integration?.scope ?? null,
      setupComplete: Boolean(integration && destination),
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
      const drive = await graphGet<Drive>(
        context.accessToken,
        '/me/drive?$select=id,webUrl'
      );
      if (!drive.id) {
        throw new Error('OneDrive destination is not available.');
      }
      destination = {
        driveId: drive.id,
        folderId: null,
        kind: 'my_drive',
        name: 'My files',
        webViewLink: drive.webUrl ?? null,
      };
    } else {
      const folder = await graphGet<DriveItem>(
        context.accessToken,
        `/drives/${encodeGraphId(input.driveId)}/items/${encodeGraphId(
          input.folderId
        )}?$select=id,name,folder,webUrl`
      ).catch(() => {
        throw new Error('OneDrive destination is not a writable folder.');
      });
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
