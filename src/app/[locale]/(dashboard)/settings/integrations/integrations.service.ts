import { apiClient } from '@/lib/api';

export type GoogleDriveStatus = {
  accountEmail: string | null;
  connected: boolean;
  destination: {
    driveId: string | null;
    folderId: string | null;
    kind: 'my_drive' | 'folder';
    name: string;
    webViewLink: string | null;
  } | null;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
  scope: string | null;
  setupComplete: boolean;
  updatedAt: string | null;
};

type GoogleDriveDestinationInput =
  | { kind: 'my_drive' }
  | { folderId: string; kind: 'folder' };

export const integrationsService = {
  disconnectGoogleDrive: async () => {
    return apiClient.delete<{ data: { disconnected: boolean } }>(
      'v1/integrations/google-drive/disconnect'
    );
  },

  getGoogleDriveStatus: async () => {
    return apiClient.get<{ data: GoogleDriveStatus }>(
      'v1/integrations/google-drive/status'
    );
  },

  setGoogleDriveDestination: async (input: GoogleDriveDestinationInput) => {
    return apiClient.put<{
      data: NonNullable<GoogleDriveStatus['destination']>;
    }>('v1/integrations/google-drive/destination', input);
  },
};
