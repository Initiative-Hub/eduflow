import { beforeEach, describe, expect, it, vi } from 'vitest';

const msalMocks = vi.hoisted(() => {
  const tokenCache = {
    deserialize: vi.fn(),
    getAccountByHomeId: vi.fn(),
    getAccountByLocalId: vi.fn(),
    getAllAccounts: vi.fn(),
    serialize: vi.fn(),
  };
  const client = {
    acquireTokenByCode: vi.fn(),
    acquireTokenByRefreshToken: vi.fn(),
    acquireTokenSilent: vi.fn(),
    getAuthCodeUrl: vi.fn(),
    getTokenCache: vi.fn(() => tokenCache),
  };
  return {
    client,
    ConfidentialClientApplication: vi.fn(function () {
      return client;
    }),
    tokenCache,
  };
});

const graphMocks = vi.hoisted(() => {
  class GraphError extends Error {
    statusCode: number;

    constructor(statusCode = -1, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return {
    Client: { initWithMiddleware: vi.fn(() => ({ kind: 'graph-client' })) },
    GraphError,
  };
});

vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: msalMocks.ConfidentialClientApplication,
}));

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: graphMocks.Client,
  GraphError: graphMocks.GraphError,
}));

import {
  getGraphErrorStatus,
  getScopeForResource,
  OneDriveMicrosoftSdkAdapter,
} from '@/services/onedrive/OneDriveMicrosoftSdkAdapter';

const account = {
  homeAccountId: 'home-account-1',
  localAccountId: 'local-account-1',
  tenantId: 'tenant-1',
};

describe('OneDriveMicrosoftSdkAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MICROSOFT_CLIENT_ID = 'microsoft-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'microsoft-client-secret';
    process.env.MICROSOFT_TENANT_ID = 'common';
  });

  it('builds MSAL authorization URLs with the configured confidential client', async () => {
    msalMocks.client.getAuthCodeUrl.mockResolvedValue(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    );

    const result = await OneDriveMicrosoftSdkAdapter.getAuthorizationUrl({
      redirectUri: 'https://eduflow.test/api/v1/integrations/onedrive/callback',
      state: 'oauth-state',
    });

    expect(result).toContain('/authorize');
    expect(msalMocks.ConfidentialClientApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          authority: 'https://login.microsoftonline.com/common',
          clientId: 'microsoft-client-id',
          clientSecret: 'microsoft-client-secret',
        }),
      })
    );
    expect(msalMocks.client.getAuthCodeUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'select_account',
        redirectUri:
          'https://eduflow.test/api/v1/integrations/onedrive/callback',
        responseMode: 'query',
        state: 'oauth-state',
      })
    );
  });

  it('hydrates and serializes MSAL token cache', () => {
    msalMocks.tokenCache.serialize.mockReturnValue('next-cache');

    const adapter = OneDriveMicrosoftSdkAdapter.createWithCache('stored-cache');

    expect(msalMocks.tokenCache.deserialize).toHaveBeenCalledWith(
      'stored-cache'
    );
    expect(adapter.serializeCache()).toBe('next-cache');
  });

  it('maps code exchange and legacy refresh token results', async () => {
    const tokenResult = {
      accessToken: 'access-token',
      account,
      expiresOn: new Date('2026-08-24T00:00:00.000Z'),
      scopes: ['Files.ReadWrite'],
      tokenType: 'Bearer',
    };
    msalMocks.client.acquireTokenByCode.mockResolvedValue(tokenResult);
    msalMocks.client.acquireTokenByRefreshToken.mockResolvedValue(tokenResult);
    const adapter = OneDriveMicrosoftSdkAdapter.createWithCache();

    await expect(
      adapter.exchangeCode({
        code: 'code',
        redirectUri: 'https://eduflow.test/callback',
      })
    ).resolves.toMatchObject({ accessToken: 'access-token' });
    await expect(
      adapter.acquireTokenByRefreshToken({
        refreshToken: 'legacy-refresh-token',
        resource: 'https://tenant-my.sharepoint.com',
      })
    ).resolves.toMatchObject({ account, accessToken: 'access-token' });
    expect(msalMocks.client.acquireTokenByRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        forceCache: true,
        refreshToken: 'legacy-refresh-token',
        scopes: ['https://tenant-my.sharepoint.com/.default'],
      })
    );
  });

  it('wires Graph client authentication to the supplied access token', async () => {
    const adapter = OneDriveMicrosoftSdkAdapter.createWithCache();

    const client = adapter.createGraphClient('graph-token');

    expect(client).toEqual({ kind: 'graph-client' });
    const options = (
      graphMocks.Client.initWithMiddleware as ReturnType<typeof vi.fn>
    ).mock.calls[0]?.[0];
    expect(options).toBeDefined();
    await expect(options.authProvider.getAccessToken()).resolves.toBe(
      'graph-token'
    );
  });

  it('normalizes picker scopes and Graph SDK error status', () => {
    expect(getScopeForResource()).toContain('Files.ReadWrite');
    expect(getScopeForResource('https://onedrive.live.com/picker')).toEqual([
      'OneDrive.ReadWrite',
    ]);
    expect(getScopeForResource('https://tenant-my.sharepoint.com')).toEqual([
      'https://tenant-my.sharepoint.com/.default',
    ]);
    expect(getGraphErrorStatus(new graphMocks.GraphError(404, 'missing'))).toBe(
      404
    );
  });
});
