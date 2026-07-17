import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GoogleDriveIntegrationService } from '@/services/GoogleDriveIntegrationService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    connectedIntegration: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const connectedIntegration = prisma.connectedIntegration as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function encryptTokenForTest(value: string) {
  const key = createHash('sha256')
    .update(process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY || '')
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

describe('GoogleDriveIntegrationService picker token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    process.env.GOOGLE_DRIVE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'google-client-secret';
    process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY = 'test-encryption-secret';
  });

  it('returns the stored access token and connected account metadata when the token is still valid', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt,
      providerAccount: 'drive-account@example.com',
      refreshToken: encryptTokenForTest('stored-refresh-token'),
      scope: 'https://www.googleapis.com/auth/drive.file',
      tokenType: 'Bearer',
    });

    const result = await (
      GoogleDriveIntegrationService as unknown as {
        getPickerToken: (userId: string) => Promise<{
          accessToken: string;
          accountEmail: string | null;
          expiresAt: Date | null;
        }>;
      }
    ).getPickerToken('user-1');

    expect(result).toEqual({
      accessToken: 'stored-access-token',
      accountEmail: 'drive-account@example.com',
      expiresAt,
    });
    expect(connectedIntegration.update).not.toHaveBeenCalled();
  });

  it('refreshes an expired access token before returning a picker token', async () => {
    vi.setSystemTime(new Date('2026-07-17T00:00:00.000Z'));
    const refreshedResponse = {
      access_token: 'refreshed-access-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/drive.file',
      token_type: 'Bearer',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(refreshedResponse), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('expired-access-token'),
      expiresAt: new Date('2026-07-16T00:00:00.000Z'),
      providerAccount: 'drive-account@example.com',
      refreshToken: encryptTokenForTest('stored-refresh-token'),
      scope: 'old-scope',
      tokenType: 'Bearer',
    });

    const result = await (
      GoogleDriveIntegrationService as unknown as {
        getPickerToken: (userId: string) => Promise<{
          accessToken: string;
          accountEmail: string | null;
          expiresAt: Date | null;
        }>;
      }
    ).getPickerToken('user-1');

    expect(result.accessToken).toBe('refreshed-access-token');
    expect(result.accountEmail).toBe('drive-account@example.com');
    expect(result.expiresAt?.toISOString()).toBe('2026-07-17T01:00:00.000Z');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: new Date('2026-07-17T01:00:00.000Z'),
          scope: refreshedResponse.scope,
          tokenType: refreshedResponse.token_type,
        }),
      })
    );
  });

  it('throws when no Google Drive account is connected', async () => {
    connectedIntegration.findUnique.mockResolvedValue(null);

    await expect(
      (
        GoogleDriveIntegrationService as unknown as {
          getPickerToken: (userId: string) => Promise<unknown>;
        }
      ).getPickerToken('user-1')
    ).rejects.toThrow('Google Drive is not connected.');
  });
});
