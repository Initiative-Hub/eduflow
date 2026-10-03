import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/integrations/onedrive/picker-authorize/route';
import { OneDriveAuthorizationError } from '@/services/onedrive/OneDriveAuthorizationError';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: (req: Request, session: { user: { id: string } }) => Response) =>
    (req: Request) =>
      handler(req, { user: { id: 'user-1' } }),
}));

vi.mock('@/services/onedrive/OneDriveOAuthTokenService', () => ({
  OneDriveOAuthTokenService: {
    getPickerAuthorizationUrl: vi.fn(),
  },
}));

const tokenService = OneDriveOAuthTokenService as unknown as {
  getPickerAuthorizationUrl: ReturnType<typeof vi.fn>;
};

describe('OneDrive Picker authorize route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getPickerAuthorizationUrl.mockResolvedValue(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
    );
  });

  it('creates Picker-bound state and redirects to Microsoft', async () => {
    const response = await GET(
      new Request(
        'https://eduflow.test/api/v1/integrations/onedrive/picker-authorize?returnTo=/vi/settings/integrations'
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain(
      'login.microsoftonline.com/consumers'
    );
    const cookies = response.headers.getSetCookie().join(';');
    expect(decodeURIComponent(cookies)).toContain('"flow":"picker"');
    expect(decodeURIComponent(cookies)).toContain('/vi/settings/integrations');
    expect(tokenService.getPickerAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    );
  });

  it('sanitizes an external return path', async () => {
    const response = await GET(
      new Request(
        'https://eduflow.test/api/v1/integrations/onedrive/picker-authorize?returnTo=https://evil.example/path'
      )
    );

    const cookies = decodeURIComponent(
      response.headers.getSetCookie().join(';')
    );
    expect(cookies).toContain('/settings/integrations');
    expect(cookies).not.toContain('evil.example');
  });

  it('returns a stable conflict when the integration must reconnect', async () => {
    tokenService.getPickerAuthorizationUrl.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_RECONNECT_REQUIRED',
        'OneDrive session expired. Reconnect OneDrive.'
      )
    );

    const response = await GET(
      new Request(
        'https://eduflow.test/api/v1/integrations/onedrive/picker-authorize'
      )
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'ONEDRIVE_RECONNECT_REQUIRED',
    });
  });
});
