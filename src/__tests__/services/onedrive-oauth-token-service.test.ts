import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OneDriveMicrosoftSdkAdapter } from '@/services/onedrive/OneDriveMicrosoftSdkAdapter';
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

vi.mock('@/services/onedrive/OneDriveMicrosoftSdkAdapter', () => ({
  getAccountMetadata: vi.fn((account) => ({
    msalHomeAccountId: account?.homeAccountId ?? null,
    msalLocalAccountId: account?.localAccountId ?? null,
    msalTenantId: account?.tenantId ?? null,
  })),
  getScopeForResource: vi.fn(() => [
    'openid',
    'email',
    'profile',
    'offline_access',
    'User.Read',
    'Files.ReadWrite',
  ]),
  OneDriveMicrosoftSdkAdapter: {
    createWithCache: vi.fn(),
    getAuthorizationUrl: vi.fn(),
  },
}));

const connectedIntegration = prisma.connectedIntegration as unknown as {
  delete: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};
const sdkAdapter = OneDriveMicrosoftSdkAdapter as unknown as {
  createWithCache: ReturnType<typeof vi.fn>;
  getAuthorizationUrl: ReturnType<typeof vi.fn>;
};

const msalAccount = {
  homeAccountId: 'home-account-1',
  localAccountId: 'local-account-1',
  tenantId: 'tenant-1',
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

function decryptTokenForTest(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(':');
  expect(version).toBe('v1');
  const key = createHash('sha256')
    .update(process.env.BETTER_AUTH_SECRET || '')
    .digest();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivValue ?? '', 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue ?? '', 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue ?? '', 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function createGraphMock() {
  const getProfile = vi.fn().mockResolvedValue({
    displayName: 'One User',
    id: 'microsoft-subject',
    mail: 'one@example.com',
  });
  const getDrive = vi.fn().mockResolvedValue({
    driveType: 'business',
    id: 'drive-1',
    webUrl: 'https://tenant-my.sharepoint.com/personal/user/Documents',
  });
  const graph = {
    api: vi.fn((path: string) => ({
      get: path === '/me' ? getProfile : getDrive,
      select: vi.fn().mockReturnThis(),
    })),
  };
  return { getDrive, getProfile, graph };
}

function createSdkMock() {
  const graph = createGraphMock();
  return {
    acquireTokenByRefreshToken: vi.fn().mockResolvedValue({
      accessToken: 'legacy-migrated-token',
      account: msalAccount,
      expiresAt: new Date('2026-08-24T01:00:00.000Z'),
      scope: 'Files.ReadWrite',
      tokenType: 'Bearer',
    }),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: 'silent-access-token',
      account: msalAccount,
      expiresAt: new Date('2026-08-24T02:00:00.000Z'),
      scope: 'Files.ReadWrite',
      tokenType: 'Bearer',
    }),
    createGraphClient: vi.fn(() => graph.graph),
    exchangeCode: vi.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      account: msalAccount,
      expiresAt: new Date('2026-08-24T00:30:00.000Z'),
      scope: 'Files.ReadWrite',
      tokenType: 'Bearer',
    }),
    findAccount: vi.fn().mockResolvedValue(msalAccount),
    graph,
    serializeCache: vi.fn().mockReturnValue('serialized-msal-cache'),
  };
}

describe('OneDriveOAuthTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETTER_AUTH_SECRET = 'test-encryption-secret';
  });

  it('builds an authorization URL through the Microsoft SDK adapter', async () => {
    sdkAdapter.getAuthorizationUrl.mockResolvedValue(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=microsoft-client-id'
    );

    const result = await OneDriveOAuthTokenService.getAuthorizationUrl({
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      state: 'oauth-state',
    });

    expect(result).toContain('microsoft-client-id');
    expect(sdkAdapter.getAuthorizationUrl).toHaveBeenCalledWith({
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      state: 'oauth-state',
    });
  });

  it('stores encrypted MSAL cache and account metadata on connect', async () => {
    const sdk = createSdkMock();
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      refreshToken: encryptTokenForTest('legacy-refresh-token'),
    });

    await OneDriveOAuthTokenService.connect({
      code: 'authorization-code',
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      userId: 'user-1',
    });

    expect(sdk.exchangeCode).toHaveBeenCalledWith({
      code: 'authorization-code',
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
    });
    expect(connectedIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: 'ONEDRIVE',
          providerAccount: 'one@example.com',
          userId: 'user-1',
        }),
        update: expect.objectContaining({
          metadata: expect.objectContaining({
            defaultDriveId: 'drive-1',
            msalHomeAccountId: 'home-account-1',
            pickerBaseUrl: 'https://tenant-my.sharepoint.com',
          }),
        }),
      })
    );
    const upsertArg = connectedIntegration.upsert.mock.calls[0]?.[0];
    expect(decryptTokenForTest(upsertArg.create.tokenCache)).toBe(
      'serialized-msal-cache'
    );
    expect(decryptTokenForTest(upsertArg.create.refreshToken)).toBe(
      'legacy-refresh-token'
    );
  });

  it('acquires Graph tokens from the encrypted MSAL cache', async () => {
    const sdk = createSdkMock();
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date('2026-08-24T00:00:00.000Z'),
      metadata: {
        msalHomeAccountId: 'home-account-1',
        pickerBaseUrl: 'https://tenant-my.sharepoint.com',
      },
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    const result =
      await OneDriveOAuthTokenService.getAuthorizedContext('user-1');

    expect(sdkAdapter.createWithCache).toHaveBeenCalledWith(
      'stored-msal-cache'
    );
    expect(sdk.findAccount).toHaveBeenCalledWith({
      homeAccountId: 'home-account-1',
      localAccountId: undefined,
    });
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      resource: undefined,
    });
    expect(result.accessToken).toBe('silent-access-token');
    expect(result.graph).toBe(sdk.graph.graph);
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessToken: expect.any(String),
          tokenCache: expect.any(String),
        }),
      })
    );
  });

  it('migrates legacy refresh-token integrations into the MSAL cache', async () => {
    const sdk = createSdkMock();
    sdk.findAccount.mockResolvedValue(null);
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date('2026-08-24T00:00:00.000Z'),
      metadata: { pickerBaseUrl: 'https://tenant-my.sharepoint.com' },
      providerAccount: 'one@example.com',
      refreshToken: encryptTokenForTest('legacy-refresh-token'),
      scope: 'Files.ReadWrite',
      tokenCache: null,
      tokenType: 'Bearer',
    });

    const result =
      await OneDriveOAuthTokenService.getAuthorizedContext('user-1');

    expect(sdk.acquireTokenByRefreshToken).toHaveBeenCalledWith({
      refreshToken: 'legacy-refresh-token',
      resource: undefined,
    });
    expect(result.accessToken).toBe('legacy-migrated-token');
    const updateArg = connectedIntegration.update.mock.calls[0]?.[0];
    expect(decryptTokenForTest(updateArg.data.tokenCache)).toBe(
      'serialized-msal-cache'
    );
  });

  it('requests resource-specific picker tokens without replacing the Graph access token fields', async () => {
    const sdk = createSdkMock();
    sdk.acquireTokenSilent.mockResolvedValue({
      accessToken: 'sharepoint-access-token',
      account: msalAccount,
      expiresAt: new Date('2026-08-24T02:00:00.000Z'),
      scope: 'https://tenant-my.sharepoint.com/.default',
      tokenType: 'Bearer',
    });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date('2026-08-24T00:00:00.000Z'),
      metadata: { msalHomeAccountId: 'home-account-1' },
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    const result = await OneDriveOAuthTokenService.getAuthorizedContext(
      'user-1',
      { resource: 'https://tenant-my.sharepoint.com' }
    );

    expect(result.accessToken).toBe('sharepoint-access-token');
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      resource: 'https://tenant-my.sharepoint.com',
    });
    expect(
      connectedIntegration.update.mock.calls[0]?.[0].data
    ).not.toHaveProperty('accessToken');
  });

  it('uses the stored picker base URL for the initial picker token', async () => {
    const sdk = createSdkMock();
    sdk.acquireTokenSilent
      .mockResolvedValueOnce({
        accessToken: 'graph-access-token',
        account: msalAccount,
        expiresAt: new Date('2026-08-24T02:00:00.000Z'),
        scope: 'Files.ReadWrite',
        tokenType: 'Bearer',
      })
      .mockResolvedValueOnce({
        accessToken: 'initial-sharepoint-picker-token',
        account: msalAccount,
        expiresAt: new Date('2026-08-24T03:00:00.000Z'),
        scope: 'https://tenant-my.sharepoint.com/.default',
        tokenType: 'Bearer',
      });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: {
        msalHomeAccountId: 'home-account-1',
        pickerBaseUrl: 'https://tenant-my.sharepoint.com',
      },
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    const result = await OneDriveOAuthTokenService.getPickerToken('user-1');

    expect(result).toEqual({
      accessToken: 'initial-sharepoint-picker-token',
      accountEmail: 'one@example.com',
      baseUrl: 'https://tenant-my.sharepoint.com',
      expiresAt: null,
    });
    expect(sdk.acquireTokenSilent.mock.calls[1]?.[0]).toEqual({
      account: msalAccount,
      resource: 'https://tenant-my.sharepoint.com',
    });
  });
});
