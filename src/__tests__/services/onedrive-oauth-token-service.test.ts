import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { InteractionRequiredAuthError } from '@azure/msal-node';
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

const businessMetadata = {
  driveType: 'business',
  msalHomeAccountId: 'home-account-1',
  msalLocalAccountId: 'local-account-1',
  msalTenantId: 'tenant-1',
  pickerBaseUrl: 'https://tenant-my.sharepoint.com',
};

const personalMetadata = {
  driveType: 'personal',
  msalHomeAccountId: 'home-account-1',
  msalLocalAccountId: 'local-account-1',
  msalTenantId: 'tenant-1',
  pickerBaseUrl: 'https://onedrive.live.com/picker',
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

  it('builds explicit Picker consent for the connected account and resource', async () => {
    sdkAdapter.getAuthorizationUrl.mockResolvedValue(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
    );
    connectedIntegration.findUnique.mockResolvedValue({
      metadata: {
        driveType: 'personal',
        msalHomeAccountId: 'home-account-1',
        msalLocalAccountId: 'local-account-1',
        msalTenantId: 'tenant-1',
        pickerBaseUrl: 'https://onedrive.live.com/picker',
      },
      providerAccount: 'one@example.com',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
    });

    await OneDriveOAuthTokenService.getPickerAuthorizationUrl({
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      state: 'picker-state',
      userId: 'user-1',
    });

    expect(sdkAdapter.getAuthorizationUrl).toHaveBeenCalledWith({
      loginHint: 'one@example.com',
      prompt: 'consent',
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      state: 'picker-state',
      target: {
        kind: 'personal-picker',
        resourceOrigin: 'https://onedrive.live.com',
      },
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
      target: { kind: 'graph' },
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
        ...businessMetadata,
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
      localAccountId: 'local-account-1',
    });
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      target: { kind: 'graph' },
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
      target: { kind: 'graph' },
    });
    expect(result.accessToken).toBe('legacy-migrated-token');
    const updateArg = connectedIntegration.update.mock.calls[0]?.[0];
    expect(decryptTokenForTest(updateArg.data.tokenCache)).toBe(
      'serialized-msal-cache'
    );
  });

  it('does not classify a Graph invalid_grant as Picker authorization', async () => {
    const sdk = createSdkMock();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    sdk.acquireTokenSilent.mockRejectedValue({
      correlationId: 'correlation-graph-1',
      errorCode: 'invalid_grant',
      subError: '',
    });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      metadata: businessMetadata,
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    await expect(
      OneDriveOAuthTokenService.getAuthorizedContext('user-1')
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_PROVIDER_ERROR',
      diagnostics: {
        correlationId: 'correlation-graph-1',
        errorCode: 'invalid_grant',
        errorNo: null,
        subError: '',
      },
    });
    consoleError.mockRestore();
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
      metadata: businessMetadata,
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    const result = await OneDriveOAuthTokenService.getPickerToken('user-1', {
      resource: 'https://tenant-my.sharepoint.com',
    });

    expect(result.accessToken).toBe('sharepoint-access-token');
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      target: {
        kind: 'sharepoint-picker',
        resourceOrigin: 'https://tenant-my.sharepoint.com',
        tenantId: 'tenant-1',
      },
    });
    expect(
      connectedIntegration.update.mock.calls[0]?.[0].data
    ).not.toHaveProperty('accessToken');
  });

  it.each([
    'https://my.microsoftpersonalcontent.com',
    'https://api.onedrive.com',
  ])('accepts %s resources for personal Picker tokens', async (resource) => {
    const sdk = createSdkMock();
    sdk.acquireTokenSilent.mockResolvedValue({
      accessToken: 'personal-picker-token',
      account: msalAccount,
      expiresAt: new Date('2026-08-24T02:00:00.000Z'),
      scope: 'OneDrive.ReadWrite',
      tokenType: 'Bearer',
    });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-graph-access-token'),
      expiresAt: new Date('2026-08-24T00:00:00.000Z'),
      metadata: personalMetadata,
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    const result = await OneDriveOAuthTokenService.getPickerToken('user-1', {
      resource,
    });

    expect(result.accessToken).toBe('personal-picker-token');
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      target: {
        kind: 'personal-picker',
        resourceOrigin: 'https://onedrive.live.com',
      },
    });
    expect(
      connectedIntegration.update.mock.calls[0]?.[0].data
    ).not.toHaveProperty('accessToken');
  });

  it('reports missing resource-specific picker consent separately from expired sessions', async () => {
    const sdk = createSdkMock();
    sdk.acquireTokenSilent.mockRejectedValue(
      new InteractionRequiredAuthError(
        'invalid_grant',
        'correlation-1',
        'Additional consent is required.',
        'consent_required'
      )
    );
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date('2026-08-24T00:00:00.000Z'),
      metadata: businessMetadata,
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    await expect(
      OneDriveOAuthTokenService.getPickerToken('user-1', {
        resource: 'https://tenant-my.sharepoint.com',
      })
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
    });
  });

  it('requires personal Picker authorization when silent acquisition returns invalid_grant without a suberror', async () => {
    const sdk = createSdkMock();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    sdk.acquireTokenSilent.mockRejectedValue({
      correlationId: 'correlation-personal-picker-1',
      errorCode: 'invalid_grant',
      subError: '',
    });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-graph-access-token'),
      metadata: personalMetadata,
      providerAccount: 'one@example.com',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
    });

    await expect(
      OneDriveOAuthTokenService.getPickerToken('user-1')
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
    });
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      target: {
        kind: 'personal-picker',
        resourceOrigin: 'https://onedrive.live.com',
      },
    });
    consoleError.mockRestore();
  });

  it('retains provider diagnostics without classifying failures as consent', async () => {
    const sdk = createSdkMock();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    sdk.acquireTokenSilent.mockRejectedValue({
      correlationId: 'correlation-provider-1',
      errorCode: 'temporarily_unavailable',
      errorNo: '500011',
    });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      metadata: businessMetadata,
      providerAccount: 'one@example.com',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
    });

    await expect(
      OneDriveOAuthTokenService.getPickerToken('user-1')
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_PROVIDER_ERROR',
      diagnostics: {
        correlationId: 'correlation-provider-1',
        errorCode: 'temporarily_unavailable',
        errorNo: '500011',
        subError: null,
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      'OneDrive Microsoft authorization failed.',
      {
        correlationId: 'correlation-provider-1',
        errorCode: 'temporarily_unavailable',
        errorNo: '500011',
        operation: 'picker_silent_token',
        subError: null,
      }
    );
    consoleError.mockRestore();
  });

  it.each(['network_error', 'invalid_client', 'invalid_request'])(
    'keeps %s Picker failures classified as provider errors',
    async (errorCode) => {
      const sdk = createSdkMock();
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      sdk.acquireTokenSilent.mockRejectedValue({
        correlationId: `correlation-${errorCode}`,
        errorCode,
      });
      sdkAdapter.createWithCache.mockReturnValue(sdk);
      connectedIntegration.findUnique.mockResolvedValue({
        metadata: personalMetadata,
        providerAccount: 'one@example.com',
        tokenCache: encryptTokenForTest('stored-msal-cache'),
      });

      await expect(
        OneDriveOAuthTokenService.getPickerToken('user-1')
      ).rejects.toMatchObject({
        code: 'ONEDRIVE_PROVIDER_ERROR',
        diagnostics: { errorCode },
      });
      consoleError.mockRestore();
    }
  );

  it('uses the stored picker base URL for the initial picker token', async () => {
    const sdk = createSdkMock();
    sdk.acquireTokenSilent.mockResolvedValue({
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
        ...businessMetadata,
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
      expiresAt: '2026-08-24T03:00:00.000Z',
    });
    expect(sdk.acquireTokenSilent).toHaveBeenCalledWith({
      account: msalAccount,
      target: {
        kind: 'sharepoint-picker',
        resourceOrigin: 'https://tenant-my.sharepoint.com',
        tenantId: 'tenant-1',
      },
    });
  });

  it('merges personal Picker consent into the cache without replacing Graph fields', async () => {
    const sdk = createSdkMock();
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      accessToken: encryptTokenForTest('stored-access-token'),
      expiresAt: new Date('2026-08-24T00:00:00.000Z'),
      metadata: {
        ...personalMetadata,
        destination: {
          driveId: 'drive-1',
          folderId: null,
          kind: 'my_drive',
          name: 'My files',
          webViewLink: null,
        },
      },
      providerAccount: 'one@example.com',
      scope: 'Files.ReadWrite',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
      tokenType: 'Bearer',
    });

    await OneDriveOAuthTokenService.authorizePicker({
      code: 'picker-code',
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      userId: 'user-1',
    });

    expect(sdk.exchangeCode).toHaveBeenCalledWith({
      code: 'picker-code',
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      target: {
        kind: 'personal-picker',
        resourceOrigin: 'https://onedrive.live.com',
      },
    });
    const updateData = connectedIntegration.update.mock.calls[0]?.[0].data;
    expect(updateData).not.toHaveProperty('accessToken');
    expect(updateData).not.toHaveProperty('expiresAt');
    expect(updateData).not.toHaveProperty('scope');
    expect(updateData.metadata.destination).toMatchObject({ kind: 'my_drive' });
    expect(decryptTokenForTest(updateData.tokenCache)).toBe(
      'serialized-msal-cache'
    );
  });

  it('rejects a different Microsoft account without updating the integration', async () => {
    const sdk = createSdkMock();
    sdk.exchangeCode.mockResolvedValue({
      accessToken: 'picker-token',
      account: { ...msalAccount, homeAccountId: 'different-home-account' },
      expiresAt: new Date('2026-08-24T03:00:00.000Z'),
      scope: 'https://tenant-my.sharepoint.com/.default',
      tokenType: 'Bearer',
    });
    sdkAdapter.createWithCache.mockReturnValue(sdk);
    connectedIntegration.findUnique.mockResolvedValue({
      metadata: businessMetadata,
      providerAccount: 'one@example.com',
      tokenCache: encryptTokenForTest('stored-msal-cache'),
    });

    await expect(
      OneDriveOAuthTokenService.authorizePicker({
        code: 'picker-code',
        redirectUri:
          'https://eduflow.test/api/v1/integrations/onedrive/callback',
        userId: 'user-1',
      })
    ).rejects.toMatchObject({
      code: 'ONEDRIVE_ACCOUNT_MISMATCH',
    });
    expect(connectedIntegration.update).not.toHaveBeenCalled();
  });
});
