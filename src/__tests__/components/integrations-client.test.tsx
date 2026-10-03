import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import IntegrationsClient from '@/app/[locale]/(dashboard)/settings/integrations/client';
import { integrationsService } from '@/app/[locale]/(dashboard)/settings/integrations/integrations.service';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'actions.connect': 'Connect',
      'actions.disconnect': 'Disconnect',
      description:
        'Connect external services that can import learning materials into your EduFlow workspace.',
      'googleDrive.accountNote':
        'Your Google Drive account can be different from your EduFlow sign-in account.',
      'googleDrive.connected': 'Connected',
      'googleDrive.description':
        'Select files from Google Drive and import them into inventory, course files, or chat attachments.',
      'googleDrive.changeFolder': 'Change folder',
      'googleDrive.destinationChangeNotice':
        'Changing the destination does not move existing exported files.',
      'googleDrive.destinationReady': 'Export destination',
      'googleDrive.driveAccount': 'Google Drive account',
      'googleDrive.eduflowAccount': 'EduFlow account',
      'googleDrive.exportSetupRequired': 'Export setup required',
      'googleDrive.noAccount': 'No account connected',
      'googleDrive.notConnected': 'Not connected',
      'googleDrive.ready': 'Ready',
      'googleDrive.scope':
        'EduFlow requests limited Drive file access for files you select or create through the app.',
      'googleDrive.title': 'Google Drive',
      'googleDrive.useMyDrive': 'Use My Drive',
      title: 'Integrations',
    };

    return messages[key] ?? key;
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock(
  '@/app/[locale]/(dashboard)/settings/integrations/integrations.service',
  () => ({
    integrationsService: {
      disconnectGoogleDrive: vi.fn(),
      getGoogleDriveStatus: vi.fn(),
      setGoogleDriveDestination: vi.fn(),
    },
  })
);

vi.mock(
  '@/app/[locale]/(dashboard)/settings/integrations/onedrive-integration-card',
  () => ({
    OneDriveIntegrationCard: () => null,
  })
);

const integrationsServiceMock = integrationsService as unknown as {
  getGoogleDriveStatus: ReturnType<typeof vi.fn>;
};

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('IntegrationsClient', () => {
  it('does not present Google Drive token expiry or reconnect as the connected state', async () => {
    integrationsServiceMock.getGoogleDriveStatus.mockResolvedValue({
      data: {
        accountEmail: 'drive@example.com',
        connected: true,
        expiresAt: '2026-07-17T01:00:00.000Z',
        metadata: null,
        scope: 'https://www.googleapis.com/auth/drive.file',
        updatedAt: '2026-07-17T00:00:00.000Z',
      },
    });

    renderWithQueryClient(<IntegrationsClient email="user@example.com" />);

    await waitFor(() => {
      expect(screen.getByText('drive@example.com')).toBeInTheDocument();
    });

    expect(screen.queryByText('Access token expires')).not.toBeInTheDocument();
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Reconnect/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Connect/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Refresh/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Disconnect/i })
    ).toBeInTheDocument();
  });

  it('uses the destination name as the Drive folder link', async () => {
    integrationsServiceMock.getGoogleDriveStatus.mockResolvedValue({
      data: {
        accountEmail: 'drive@example.com',
        connected: true,
        destination: {
          driveId: null,
          folderId: 'folder-1',
          kind: 'folder',
          name: 'Eduflow',
          webViewLink: 'https://drive.google.com/drive/folders/folder-1',
        },
        expiresAt: '2026-07-17T01:00:00.000Z',
        metadata: null,
        scope: 'https://www.googleapis.com/auth/drive.file',
        setupComplete: true,
        updatedAt: '2026-07-17T00:00:00.000Z',
      },
    });

    renderWithQueryClient(<IntegrationsClient email="user@example.com" />);

    const destinationLink = await screen.findByRole('link', {
      name: 'Eduflow',
    });

    expect(destinationLink).toHaveAttribute(
      'href',
      'https://drive.google.com/drive/folders/folder-1'
    );
    expect(
      screen.queryByRole('link', { name: /Open folder/i })
    ).not.toBeInTheDocument();
  });
});
