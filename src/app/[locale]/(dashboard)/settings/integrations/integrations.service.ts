import { apiClient } from '@/lib/api';

export type GoogleDriveStatus = {
  accountEmail: string | null;
  connected: boolean;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
  scope: string | null;
  updatedAt: string | null;
};

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
};
