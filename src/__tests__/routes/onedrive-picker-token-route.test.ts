import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/integrations/onedrive/picker-token/route';
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
    getPickerToken: vi.fn(),
  },
}));

const oneDriveOAuthTokenService = OneDriveOAuthTokenService as unknown as {
  getPickerToken: ReturnType<typeof vi.fn>;
};

function createPickerTokenRequest(body?: unknown) {
  return new Request(
    'https://eduflow.test/api/v1/integrations/onedrive/picker-token',
    {
      body: JSON.stringify(body ?? {}),
      method: 'POST',
    }
  );
}

describe('OneDrive picker token route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a picker token for the authenticated EduFlow user', async () => {
    oneDriveOAuthTokenService.getPickerToken.mockResolvedValue({
      accessToken: 'server-token',
      accountEmail: 'drive@example.com',
      baseUrl: 'https://onedrive.live.com/picker',
      expiresAt: null,
    });

    const response = await POST(
      createPickerTokenRequest({
        command: 'authenticate',
        resource: 'https://onedrive.live.com/picker',
      })
    );

    await expect(response.json()).resolves.toEqual({
      data: {
        accessToken: 'server-token',
        accountEmail: 'drive@example.com',
        baseUrl: 'https://onedrive.live.com/picker',
        expiresAt: null,
      },
    });
    expect(response.status).toBe(200);
    expect(oneDriveOAuthTokenService.getPickerToken).toHaveBeenCalledWith(
      'user-1',
      {
        command: 'authenticate',
        resource: 'https://onedrive.live.com/picker',
      }
    );
  });

  it.each([
    'https://my.microsoftpersonalcontent.com',
    'https://api.onedrive.com',
  ])('accepts personal OneDrive authenticate resource %s', async (resource) => {
    oneDriveOAuthTokenService.getPickerToken.mockResolvedValue({
      accessToken: 'server-token',
      accountEmail: 'drive@example.com',
      baseUrl: 'https://onedrive.live.com/picker',
      expiresAt: null,
    });

    const response = await POST(
      createPickerTokenRequest({
        command: 'authenticate',
        resource,
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      data: {
        accessToken: 'server-token',
      },
    });
    expect(response.status).toBe(200);
    expect(oneDriveOAuthTokenService.getPickerToken).toHaveBeenCalledWith(
      'user-1',
      {
        command: 'authenticate',
        resource,
      }
    );
  });

  it('returns a stable 409 when the OneDrive session needs reconnecting', async () => {
    oneDriveOAuthTokenService.getPickerToken.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_RECONNECT_REQUIRED',
        'OneDrive session expired. Reconnect OneDrive.'
      )
    );

    const response = await POST(createPickerTokenRequest());

    await expect(response.json()).resolves.toEqual({
      code: 'ONEDRIVE_RECONNECT_REQUIRED',
      message: 'OneDrive session expired. Reconnect OneDrive.',
    });
    expect(response.status).toBe(409);
  });

  it('returns a stable 409 when Picker consent is required', async () => {
    oneDriveOAuthTokenService.getPickerToken.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
        'Microsoft requires additional permission to browse OneDrive folders.'
      )
    );

    const response = await POST(createPickerTokenRequest());

    await expect(response.json()).resolves.toEqual({
      code: 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
      message:
        'Microsoft requires additional permission to browse OneDrive folders.',
    });
    expect(response.status).toBe(409);
  });

  it('returns 409 when OneDrive is not connected', async () => {
    oneDriveOAuthTokenService.getPickerToken.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_NOT_CONNECTED',
        'OneDrive is not connected.'
      )
    );

    const response = await POST(createPickerTokenRequest());

    await expect(response.json()).resolves.toEqual({
      code: 'ONEDRIVE_NOT_CONNECTED',
      message: 'OneDrive is not connected.',
    });
    expect(response.status).toBe(409);
  });

  it('returns 400 for an unrelated Picker resource', async () => {
    oneDriveOAuthTokenService.getPickerToken.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_INVALID_PICKER_RESOURCE',
        'The requested Picker resource does not belong to the connected OneDrive.'
      )
    );

    const response = await POST(createPickerTokenRequest());

    await expect(response.json()).resolves.toMatchObject({
      code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
    });
    expect(response.status).toBe(400);
  });

  it('returns 500 for an unexpected Microsoft provider failure', async () => {
    oneDriveOAuthTokenService.getPickerToken.mockRejectedValue(
      new OneDriveAuthorizationError(
        'ONEDRIVE_PROVIDER_ERROR',
        'Microsoft could not complete the OneDrive authorization request.',
        {
          correlationId: 'correlation-provider-1',
          errorCode: 'temporarily_unavailable',
          errorNo: null,
          subError: null,
        }
      )
    );

    const response = await POST(createPickerTokenRequest());

    await expect(response.json()).resolves.toMatchObject({
      code: 'ONEDRIVE_PROVIDER_ERROR',
      details: {
        correlationId: 'correlation-provider-1',
        errorCode: 'temporarily_unavailable',
        errorNo: null,
        subError: null,
      },
    });
    expect(response.status).toBe(500);
  });
});
