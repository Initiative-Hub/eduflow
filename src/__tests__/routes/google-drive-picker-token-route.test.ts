import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/integrations/google-drive/picker-token/route';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: (req: Request, session: { user: { id: string } }) => Response) =>
    (req: Request) =>
      handler(req, { user: { id: 'user-1' } }),
}));

vi.mock('@/services/google-drive/GoogleDriveOAuthTokenService', () => ({
  GoogleDriveOAuthTokenService: {
    getPickerToken: vi.fn(),
  },
}));

const googleDriveOAuthTokenService =
  GoogleDriveOAuthTokenService as unknown as {
    getPickerToken: ReturnType<typeof vi.fn>;
  };

describe('Google Drive picker token route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a picker token for the authenticated EduFlow user', async () => {
    googleDriveOAuthTokenService.getPickerToken.mockResolvedValue({
      accessToken: 'server-token',
      accountEmail: 'drive@example.com',
      expiresAt: new Date('2026-07-17T01:00:00.000Z'),
    });

    const response = await GET(
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/picker-token'
      )
    );

    await expect(response.json()).resolves.toEqual({
      data: {
        accessToken: 'server-token',
        accountEmail: 'drive@example.com',
        expiresAt: '2026-07-17T01:00:00.000Z',
      },
    });
    expect(response.status).toBe(200);
    expect(googleDriveOAuthTokenService.getPickerToken).toHaveBeenCalledWith(
      'user-1'
    );
  });

  it('returns 409 when Google Drive is not connected', async () => {
    googleDriveOAuthTokenService.getPickerToken.mockRejectedValue(
      new Error('Google Drive is not connected.')
    );

    const response = await GET(
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/picker-token'
      )
    );

    await expect(response.json()).resolves.toEqual({
      message: 'Google Drive is not connected.',
    });
    expect(response.status).toBe(409);
  });
});
