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

export type OneDriveStatus = {
  accountEmail: string | null;
  connected: boolean;
  destination: {
    driveId: string;
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

type OneDriveDestinationInput =
  | { kind: 'my_drive' }
  | { driveId: string; folderId: string; kind: 'folder' };

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

  disconnectOneDrive: async () => {
    return apiClient.delete<{ data: { disconnected: boolean } }>(
      'v1/integrations/onedrive/disconnect'
    );
  },

  getOneDriveStatus: async () => {
    return apiClient.get<{ data: OneDriveStatus }>(
      'v1/integrations/onedrive/status'
    );
  },

  setOneDriveDestination: async (input: OneDriveDestinationInput) => {
    return apiClient.put<{
      data: NonNullable<OneDriveStatus['destination']>;
    }>('v1/integrations/onedrive/destination', input);
  },
};
