import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { GoogleDriveOAuthTokenService } from './GoogleDriveOAuthTokenService';
import {
  type GoogleDriveDestination,
  parseGoogleDriveDestination,
} from './google-drive-types';

export class GoogleDriveDestinationService {
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
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    const destination = parseGoogleDriveDestination(
      integration?.metadata ?? null
    );
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
      await GoogleDriveOAuthTokenService.getAuthorizedContext(userId);
    if (!context.destination) {
      throw new Error('Google Drive export destination is not configured.');
    }
    return { ...context, destination: context.destination };
  }

  static async setDestination(
    userId: string,
    input: { kind: 'my_drive' } | { folderId: string; kind: 'folder' }
  ): Promise<GoogleDriveDestination> {
    const context =
      await GoogleDriveOAuthTokenService.getAuthorizedContext(userId);
    let destination: GoogleDriveDestination;
    if (input.kind === 'my_drive') {
      destination = {
        driveId: null,
        folderId: null,
        kind: 'my_drive',
        name: 'My Drive',
        webViewLink: 'https://drive.google.com/drive/my-drive',
      };
    } else {
      const folder = await (async () => {
        try {
          return (
            await context.drive.files.get({
              fields:
                'id,name,mimeType,trashed,driveId,webViewLink,capabilities/canAddChildren',
              fileId: input.folderId,
              supportsAllDrives: true,
            })
          ).data;
        } catch {
          throw new Error('Google Drive destination is not a writable folder.');
        }
      })();
      if (
        folder.mimeType !== 'application/vnd.google-apps.folder' ||
        !folder.id ||
        folder.trashed ||
        folder.capabilities?.canAddChildren !== true
      ) {
        throw new Error('Google Drive destination is not a writable folder.');
      }
      destination = {
        driveId: folder.driveId ?? null,
        folderId: folder.id,
        kind: 'folder',
        name: folder.name?.trim() || 'Google Drive folder',
        webViewLink: folder.webViewLink ?? null,
      };
    }

    await prisma.connectedIntegration.update({
      data: { metadata: { ...context.metadata, destination } },
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    return destination;
  }
}
