import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    connectedIntegration: {
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const connectedIntegration = prisma.connectedIntegration as unknown as {
  delete: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

function encryptTokenForTest(value: string) {
  const key = createHash('sha256')
    .update(process.env.BETTER_AUTH_SECRET || '')
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

describe('OneDriveOAuthTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MICROSOFT_CLIENT_ID = 'microsoft-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'microsoft-client-secret';
    process.env.MICROSOFT_TENANT_ID = 'common';
    process.env.BETTER_AUTH_SECRET = 'test-encryption-secret';
    vi.stubGlobal('fetch', vi.fn());
  });

  it('builds an authorization URL with offline OneDrive scopes', () => {
    const result = OneDriveOAuthTokenService.getAuthorizationUrl({
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      state: 'oauth-state',
    });

    const url = new URL(result);
    expect(url.origin).toBe('https://login.microsoftonline.com');
    expect(url.pathname).toBe('/common/oauth2/v2.0/authorize');
    expect(url.searchParams.get('client_id')).toBe('microsoft-client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toContain('offline_access');
    expect(url.searchParams.get('scope')).toContain('Files.ReadWrite');
    expect(url.searchParams.get('state')).toBe('oauth-state');
  });

  it('stores encrypted tokens and account metadata on connect', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
          scope: 'Files.ReadWrite',
          token_type: 'Bearer',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          displayName: 'One User',
          id: 'microsoft-subject',
          mail: 'one@example.com',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          driveType: 'business',
          id: 'drive-1',
          webUrl: 'https://tenant-my.sharepoint.com/personal/user/Documents',
        })
      );

    await OneDriveOAuthTokenService.connect({
      code: 'authorization-code',
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      userId: 'user-1',
    });

    expect(connectedIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: 'ONEDRIVE',
          providerAccount: 'one@example.com',
          userId: 'user-1',
        }),
        update: expect.objectContaining({
          providerAccount: 'one@example.com',
        }),
      })
    );
  });

  it('refreshes stored credentials and replaces returned refresh tokens', async () => {
    vi.setSystemTime(new Date('2026-08-24T00:00:00.000Z'));
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('expired-access-token'),
      expiresAt: new Date('2026-08-23T00:00:00.000Z'),
      metadata: {},
      providerAccount: 'one@example.com',
      refreshToken: encryptTokenForTest('stored-refresh-token'),
      scope: 'Files.ReadWrite',
      tokenType: 'Bearer',
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        access_token: 'refreshed-access-token',
        expires_in: 3600,
        refresh_token: 'replacement-refresh-token',
        scope: 'Files.ReadWrite',
        token_type: 'Bearer',
      })
    );

    const result = await OneDriveOAuthTokenService.getPickerToken('user-1');

    expect(result.accessToken).toBe('refreshed-access-token');
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: 'Files.ReadWrite',
          tokenType: 'Bearer',
        }),
      })
    );
  });

  it('requests resource-specific picker tokens without persisting them', async () => {
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: { pickerBaseUrl: 'https://tenant-my.sharepoint.com' },
      providerAccount: 'one@example.com',
      refreshToken: encryptTokenForTest('stored-refresh-token'),
      scope: 'Files.ReadWrite',
      tokenType: 'Bearer',
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        access_token: 'sharepoint-access-token',
        expires_in: 3600,
        scope: 'https://tenant-my.sharepoint.com/.default',
        token_type: 'Bearer',
      })
    );

    const result = await OneDriveOAuthTokenService.getPickerToken('user-1', {
      resource: 'https://tenant-my.sharepoint.com',
    });

    expect(result.accessToken).toBe('sharepoint-access-token');
    expect(connectedIntegration.update).not.toHaveBeenCalled();
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(init?.body)).toContain(
      'scope=https%3A%2F%2Ftenant-my.sharepoint.com%2F.default'
    );
  });
});
