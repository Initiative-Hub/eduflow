import {
  ConfidentialClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from '@azure/msal-node';
import {
  Client,
  GraphError,
  type AuthenticationProvider,
} from '@microsoft/microsoft-graph-client';

export const ONEDRIVE_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'User.Read',
  'Files.ReadWrite',
];

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

export function assertAllowedPickerResource(resource: string) {
  let url: URL;
  try {
    url = new URL(resource);
  } catch {
    throw new Error('Invalid OneDrive picker resource.');
  }

  const host = url.hostname.toLowerCase();
  if (
    host === 'graph.microsoft.com' ||
    host === 'onedrive.live.com' ||
    host.endsWith('.sharepoint.com') ||
    host.endsWith('.sharepoint-df.com')
  ) {
    return url.origin;
  }
  throw new Error('Unsupported OneDrive picker resource.');
}

export function getScopeForResource(resource?: string) {
  if (!resource) return ONEDRIVE_SCOPES;
  const origin = assertAllowedPickerResource(resource);
  if (origin === 'https://graph.microsoft.com') {
    return ONEDRIVE_SCOPES;
  }
  if (origin === 'https://onedrive.live.com') {
    return ['OneDrive.ReadWrite'];
  }
  return [`${origin}/.default`];
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
    redirectUri: string;
    state: string;
  }) {
    return OneDriveMicrosoftSdkAdapter.createWithCache().client.getAuthCodeUrl({
      prompt: 'select_account',
      redirectUri: options.redirectUri,
      responseMode: 'query',
      scopes: ONEDRIVE_SCOPES,
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

  async exchangeCode(options: { code: string; redirectUri: string }) {
    const result = await this.client.acquireTokenByCode({
      code: options.code,
      redirectUri: options.redirectUri,
      scopes: ONEDRIVE_SCOPES,
    });
    if (!result?.accessToken) {
      throw new Error('Microsoft did not return an access token.');
    }
    return mapTokenResult(result);
  }

  async acquireTokenSilent(options: {
    account: AccountInfo;
    resource?: string | null;
  }) {
    const result = await this.client.acquireTokenSilent({
      account: options.account,
      scopes: getScopeForResource(options.resource ?? undefined),
    });
    if (!result?.accessToken) {
      throw new Error('Microsoft did not return an access token.');
    }
    return mapTokenResult(result);
  }

  async acquireTokenByRefreshToken(options: {
    refreshToken: string;
    resource?: string | null;
  }) {
    const result = await this.client.acquireTokenByRefreshToken({
      forceCache: true,
      refreshToken: options.refreshToken,
      scopes: getScopeForResource(options.resource ?? undefined),
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
