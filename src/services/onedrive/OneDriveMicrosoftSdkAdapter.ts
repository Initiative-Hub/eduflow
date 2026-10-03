import {
  type AccountInfo,
  type AuthenticationResult,
  ConfidentialClientApplication,
} from '@azure/msal-node';
import {
  type AuthenticationProvider,
  Client,
  GraphError,
} from '@microsoft/microsoft-graph-client';
import {
  getTokenTargetAuthority,
  getTokenTargetScopes,
  type OneDriveTokenTarget,
} from './OneDriveTokenTarget';

export const ONEDRIVE_SCOPES = getTokenTargetScopes({ kind: 'graph' });

type OneDriveSdkConfig = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
};

export type OneDriveMsalAccountMetadata = {
  msalHomeAccountId: string | null;
  msalLocalAccountId: string | null;
  msalTenantId: string | null;
};

export type OneDriveTokenResult = {
  accessToken: string;
  account: AccountInfo | null;
  expiresAt: Date | null;
  scope: string | null;
  tokenType: string | null;
};

export type OneDriveTokenCacheOwner = {
  client: ConfidentialClientApplication;
};

function getTenantId() {
  return process.env.MICROSOFT_TENANT_ID || 'common';
}

function getConfig(): OneDriveSdkConfig {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('OneDrive OAuth credentials are not configured.');
  }
  return { clientId, clientSecret, tenantId: getTenantId() };
}

function getAuthority() {
  const { tenantId } = getConfig();
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}`;
}

function createClient() {
  const { clientId, clientSecret } = getConfig();
  return new ConfidentialClientApplication({
    auth: {
      authority: getAuthority(),
      clientId,
      clientSecret,
    },
  });
}

function mapTokenResult(result: AuthenticationResult): OneDriveTokenResult {
  return {
    accessToken: result.accessToken,
    account: result.account,
    expiresAt: result.expiresOn,
    scope: result.scopes.join(' '),
    tokenType: result.tokenType,
  };
}

export function getAccountMetadata(
  account: AccountInfo | null
): OneDriveMsalAccountMetadata {
  return {
    msalHomeAccountId: account?.homeAccountId ?? null,
    msalLocalAccountId: account?.localAccountId ?? null,
    msalTenantId: account?.tenantId ?? null,
  };
}

export function getGraphErrorStatus(error: unknown) {
  if (error instanceof GraphError) return error.statusCode;
  if (!error || typeof error !== 'object' || !('statusCode' in error)) {
    return null;
  }
  const statusCode = error.statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}

export function getGraphErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Microsoft Graph request failed.';
}

export class OneDriveMicrosoftSdkAdapter {
  static createWithCache(serializedCache?: string | null) {
    const client = createClient();
    if (serializedCache) {
      client.getTokenCache().deserialize(serializedCache);
    }
    return new OneDriveMicrosoftSdkAdapter(client);
  }

  static async getAuthorizationUrl(options: {
    loginHint?: string | null;
    prompt?: 'consent' | 'select_account';
    redirectUri: string;
    state: string;
    target?: OneDriveTokenTarget;
  }) {
    const target = options.target ?? { kind: 'graph' };
    const authority = getTokenTargetAuthority(target) ?? undefined;
    return OneDriveMicrosoftSdkAdapter.createWithCache().client.getAuthCodeUrl({
      authority,
      loginHint: options.loginHint ?? undefined,
      prompt: options.prompt ?? 'select_account',
      redirectUri: options.redirectUri,
      responseMode: 'query',
      scopes: getTokenTargetScopes(target),
      state: options.state,
    });
  }

  private constructor(private readonly client: ConfidentialClientApplication) {}

  serializeCache() {
    return this.client.getTokenCache().serialize();
  }

  createGraphClient(accessToken: string) {
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => accessToken,
    };
    return Client.initWithMiddleware({ authProvider });
  }

  async exchangeCode(options: {
    code: string;
    redirectUri: string;
    target?: OneDriveTokenTarget;
  }) {
    const target = options.target ?? { kind: 'graph' };
    const result = await this.client.acquireTokenByCode({
      authority: getTokenTargetAuthority(target) ?? undefined,
      code: options.code,
      redirectUri: options.redirectUri,
      scopes: getTokenTargetScopes(target),
    });
    if (!result?.accessToken) {
      throw new Error('Microsoft did not return an access token.');
    }
    return mapTokenResult(result);
  }

  async acquireTokenSilent(options: {
    account: AccountInfo;
    target: OneDriveTokenTarget;
  }) {
    const result = await this.client.acquireTokenSilent({
      account: options.account,
      authority: getTokenTargetAuthority(options.target) ?? undefined,
      scopes: getTokenTargetScopes(options.target),
    });
    if (!result?.accessToken) {
      throw new Error('Microsoft did not return an access token.');
    }
    return mapTokenResult(result);
  }

  async acquireTokenByRefreshToken(options: {
    refreshToken: string;
    target?: OneDriveTokenTarget;
  }) {
    const target = options.target ?? { kind: 'graph' };
    const result = await this.client.acquireTokenByRefreshToken({
      authority: getTokenTargetAuthority(target) ?? undefined,
      forceCache: true,
      refreshToken: options.refreshToken,
      scopes: getTokenTargetScopes(target),
    });
    if (!result?.accessToken) {
      throw new Error('Microsoft did not return an access token.');
    }
    return mapTokenResult(result);
  }

  async findAccount(options?: {
    homeAccountId?: string | null;
    localAccountId?: string | null;
  }) {
    if (options?.homeAccountId) {
      const account = await this.client
        .getTokenCache()
        .getAccountByHomeId(options.homeAccountId);
      if (account) return account;
    }
    if (options?.localAccountId) {
      const account = await this.client
        .getTokenCache()
        .getAccountByLocalId(options.localAccountId);
      if (account) return account;
    }
    return (await this.client.getTokenCache().getAllAccounts())[0] ?? null;
  }
}
