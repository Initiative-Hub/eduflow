import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';

const googleMocks = vi.hoisted(() => {
  const auth = {
    credentials: {} as Record<string, unknown>,
    generateAuthUrl: vi.fn(),
    getAccessToken: vi.fn(),
    getToken: vi.fn(),
    revokeToken: vi.fn(),
    setCredentials: vi.fn(),
  };
  return {
    auth,
    drive: vi.fn(() => ({ files: {} })),
    OAuth2: vi.fn(function OAuth2() {
      return auth;
    }),
    userinfoGet: vi.fn(),
  };
});

vi.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: googleMocks.OAuth2 },
    drive: googleMocks.drive,
    oauth2: vi.fn(() => ({
      userinfo: { get: googleMocks.userinfoGet },
    })),
  },
}));

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

describe('GoogleDriveOAuthTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.BETTER_AUTH_SECRET = 'test-encryption-secret';
    googleMocks.auth.credentials = {};
    googleMocks.auth.setCredentials.mockImplementation((credentials) => {
      googleMocks.auth.credentials = { ...credentials };
    });
    googleMocks.auth.getAccessToken.mockImplementation(async () => ({
      token: googleMocks.auth.credentials.access_token,
    }));
  });

  it('returns the stored access token without persisting unchanged credentials', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt,
      metadata: {},
      providerAccount: 'drive-account@example.com',
      refreshToken: encryptTokenForTest('stored-refresh-token'),
      scope: 'https://www.googleapis.com/auth/drive.file',
      tokenType: 'Bearer',
    });

    const result = await GoogleDriveOAuthTokenService.getPickerToken('user-1');

    expect(result).toEqual({
      accessToken: 'stored-access-token',
      accountEmail: 'drive-account@example.com',
      expiresAt,
    });
    expect(connectedIntegration.update).not.toHaveBeenCalled();
    expect(googleMocks.drive).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'v3' })
    );
  });

  it('persists credentials refreshed by the OAuth client', async () => {
    vi.setSystemTime(new Date('2026-07-17T00:00:00.000Z'));
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('expired-access-token'),
      expiresAt: new Date('2026-07-16T00:00:00.000Z'),
      metadata: {},
      providerAccount: 'drive-account@example.com',
      refreshToken: encryptTokenForTest('stored-refresh-token'),
      scope: 'old-scope',
      tokenType: 'Bearer',
    });
    googleMocks.auth.getAccessToken.mockImplementation(async () => {
      googleMocks.auth.credentials = {
        ...googleMocks.auth.credentials,
        access_token: 'refreshed-access-token',
        expiry_date: new Date('2026-07-17T01:00:00.000Z').getTime(),
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      };
      return { token: 'refreshed-access-token' };
    });

    const result = await GoogleDriveOAuthTokenService.getPickerToken('user-1');

    expect(result.accessToken).toBe('refreshed-access-token');
    expect(result.expiresAt?.toISOString()).toBe('2026-07-17T01:00:00.000Z');
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: new Date('2026-07-17T01:00:00.000Z'),
          scope: 'https://www.googleapis.com/auth/drive.file',
          tokenType: 'Bearer',
        }),
      })
    );
  });

  it('throws when no Google Drive account is connected', async () => {
    connectedIntegration.findUnique.mockResolvedValue(null);
    await expect(
      GoogleDriveOAuthTokenService.getPickerToken('user-1')
    ).rejects.toThrow('Google Drive is not connected.');
  });

  it('delegates authorization URL generation with offline consent settings', () => {
    googleMocks.auth.generateAuthUrl.mockReturnValue(
      'https://accounts.google.test/authorize'
    );

    const result = GoogleDriveOAuthTokenService.getAuthorizationUrl({
      redirectUri:
        'https://eduflow.test/api/v1/integrations/google-drive/callback',
      state: 'oauth-state',
    });

    expect(result).toBe('https://accounts.google.test/authorize');
    expect(googleMocks.auth.generateAuthUrl).toHaveBeenCalledWith({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent select_account',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'openid',
        'email',
        'profile',
      ],
      state: 'oauth-state',
    });
  });

  it('preserves an existing refresh token when reconnect omits one', async () => {
    const existingRefreshToken = encryptTokenForTest('existing-refresh-token');
    connectedIntegration.findUnique.mockResolvedValue({
      refreshToken: existingRefreshToken,
    });
    googleMocks.auth.getToken.mockResolvedValue({
      tokens: {
        access_token: 'new-access-token',
        expiry_date: new Date('2026-07-17T01:00:00.000Z').getTime(),
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer',
      },
    });
    googleMocks.userinfoGet.mockResolvedValue({
      data: {
        email: 'drive-account@example.com',
        id: 'google-subject',
        name: 'Drive User',
        picture: 'https://example.test/avatar.png',
      },
    });

    await GoogleDriveOAuthTokenService.connect({
      code: 'authorization-code',
      redirectUri:
        'https://eduflow.test/api/v1/integrations/google-drive/callback',
      userId: 'user-1',
    });

    expect(googleMocks.auth.getToken).toHaveBeenCalledWith({
      code: 'authorization-code',
      redirect_uri:
        'https://eduflow.test/api/v1/integrations/google-drive/callback',
    });
    expect(connectedIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          providerAccount: 'drive-account@example.com',
          refreshToken: existingRefreshToken,
        }),
      })
    );
  });

  it('revokes the refresh token before deleting the local integration', async () => {
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      refreshToken: encryptTokenForTest('stored-refresh-token'),
    });
    googleMocks.auth.revokeToken.mockResolvedValue({});

    await GoogleDriveOAuthTokenService.disconnect('user-1');

    expect(googleMocks.auth.revokeToken).toHaveBeenCalledWith(
      'stored-refresh-token'
    );
    expect(connectedIntegration.delete).toHaveBeenCalledWith({
      where: {
        userId_provider: { provider: 'GOOGLE_DRIVE', userId: 'user-1' },
      },
    });
  });
});
