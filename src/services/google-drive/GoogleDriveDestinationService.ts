import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { GoogleDriveOAuthTokenService } from './GoogleDriveOAuthTokenService';
import { fetchGoogleJson } from './google-drive-http';
import {
  type GoogleDriveDestination,
  type GoogleDriveFileMetadata,
  parseGoogleDriveDestination,
} from './google-drive-types';

const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

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
    const token =
      await GoogleDriveOAuthTokenService.getAccessTokenDetails(userId);
    if (!token.destination) {
      throw new Error('Google Drive export destination is not configured.');
    }
    return { accessToken: token.accessToken, destination: token.destination };
  }

  static async setDestination(
    userId: string,
    input: { kind: 'my_drive' } | { folderId: string; kind: 'folder' }
  ): Promise<GoogleDriveDestination> {
    const token =
      await GoogleDriveOAuthTokenService.getAccessTokenDetails(userId);
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
      const params = new URLSearchParams({
        fields:
          'id,name,mimeType,trashed,driveId,webViewLink,capabilities/canAddChildren',
        supportsAllDrives: 'true',
      });
      let folder: GoogleDriveFileMetadata;
      try {
        folder = await fetchGoogleJson<GoogleDriveFileMetadata>(
          `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(input.folderId)}?${params}`,
          token.accessToken
        );
      } catch {
        throw new Error('Google Drive destination is not a writable folder.');
      }
      if (
        folder.mimeType !== 'application/vnd.google-apps.folder' ||
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
      data: { metadata: { ...token.metadata, destination } },
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    return destination;
  }
}
