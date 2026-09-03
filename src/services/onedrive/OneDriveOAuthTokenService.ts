import { randomBytes, timingSafeEqual } from 'node:crypto';
import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  decryptCloudDriveToken,
  encryptCloudDriveToken,
} from '@/services/cloud-drive/token-encryption';
import {
  type OneDriveDestination,
  parseOneDriveDestination,
  parseOneDriveMetadata,
} from './onedrive-types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const ONEDRIVE_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'User.Read',
  'Files.ReadWrite',
];
const TOKEN_REFRESH_SKEW_MS = 60_000;

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};
type AuthorizedTokenResponse = TokenResponse & { access_token: string };

type MicrosoftProfile = {
  displayName?: string | null;
  id?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

type MicrosoftDrive = {
  driveType?: string | null;
  id?: string | null;
  webUrl?: string | null;
};

export type OneDriveAuthorizedContext = {
  accessToken: string;
  accountEmail: string | null;
  destination: OneDriveDestination | null;
  metadata: ReturnType<typeof parseOneDriveMetadata>;
};

function getTenantId() {
  return process.env.MICROSOFT_TENANT_ID || 'common';
}

function getConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('OneDrive OAuth credentials are not configured.');
  }
  return { clientId, clientSecret, tenantId: getTenantId() };
}

function getTokenEndpoint() {
  const { tenantId } = getConfig();
  return `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/token`;
}

function toDateFromExpiresIn(expiresIn?: number) {
  return typeof expiresIn === 'number'
    ? new Date(Date.now() + expiresIn * 1000)
    : null;
}

function isExpired(expiresAt: Date | null) {
  return (
    !expiresAt || expiresAt.getTime() - TOKEN_REFRESH_SKEW_MS <= Date.now()
  );
}

function encryptToken(value: string) {
  return encryptCloudDriveToken(value);
}

function decryptToken(value: string) {
  return decryptCloudDriveToken(value, 'OneDrive');
}

function getPickerBaseUrl(drive: MicrosoftDrive) {
  if (drive.driveType === 'personal') return 'https://onedrive.live.com/picker';
  try {
    return drive.webUrl ? new URL(drive.webUrl).origin : null;
  } catch {
    return null;
  }
}

function assertAllowedPickerResource(resource: string) {
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

function getScopeForResource(resource?: string) {
  if (!resource) return ONEDRIVE_SCOPES.join(' ');
  const origin = assertAllowedPickerResource(resource);
  if (origin === 'https://graph.microsoft.com') {
    return ONEDRIVE_SCOPES.join(' ');
  }
  if (origin === 'https://onedrive.live.com') {
    return 'OneDrive.ReadWrite';
  }
  return `${origin}/.default`;
}

async function parseMicrosoftJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message =
      typeof data.error_description === 'string'
        ? data.error_description
        : typeof data.error?.message === 'string'
          ? data.error.message
          : typeof data.error === 'string'
            ? data.error
            : text || response.statusText;
    throw new Error(
      `Microsoft request failed (${response.status}): ${message}`
    );
  }
  return data as T;
}

async function exchangeToken(
  params: Record<string, string>
): Promise<AuthorizedTokenResponse> {
  const { clientId, clientSecret } = getConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    ...params,
  });
  const response = await fetch(getTokenEndpoint(), {
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const token = await parseMicrosoftJson<TokenResponse>(response);
  if (!token.access_token) {
    throw new Error('Microsoft did not return an access token.');
  }
  return token as AuthorizedTokenResponse;
}

async function graphGet<T>(accessToken: string, path: string) {
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseMicrosoftJson<T>(response);
}

async function getAccountMetadata(accessToken: string) {
  const [profile, drive] = await Promise.all([
    graphGet<MicrosoftProfile>(
      accessToken,
      '/me?$select=id,displayName,mail,userPrincipalName'
    ),
    graphGet<MicrosoftDrive>(
      accessToken,
      '/me/drive?$select=id,webUrl,driveType'
    ),
  ]);

  return {
    accountEmail: profile.mail ?? profile.userPrincipalName ?? null,
    metadata: {
      accountName: profile.displayName ?? null,
      defaultDriveId: drive.id ?? null,
      driveType: drive.driveType ?? null,
      microsoftSubject: profile.id ?? null,
      pickerBaseUrl: getPickerBaseUrl(drive),
    },
  };
}

export class OneDriveOAuthTokenService {
  static createState() {
    return randomBytes(32).toString('base64url');
  }

  static assertState(receivedState: string, expectedState: string) {
    const received = Buffer.from(receivedState);
    const expected = Buffer.from(expectedState);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new Error('Invalid OneDrive OAuth state.');
    }
  }

  static getAuthorizationUrl(options: { redirectUri: string; state: string }) {
    const { clientId, tenantId } = getConfig();
    const url = new URL(
      `https://login.microsoftonline.com/${encodeURIComponent(
        tenantId
      )}/oauth2/v2.0/authorize`
    );
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', options.redirectUri);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', ONEDRIVE_SCOPES.join(' '));
    url.searchParams.set('state', options.state);
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

  static async connect(options: {
    code: string;
    redirectUri: string;
    userId: string;
  }) {
    const token = await exchangeToken({
      code: options.code,
      grant_type: 'authorization_code',
      redirect_uri: options.redirectUri,
      scope: ONEDRIVE_SCOPES.join(' '),
    });
    if (!token.refresh_token) {
      throw new Error('Microsoft did not return a refresh token.');
    }

    const account = await getAccountMetadata(token.access_token);
    const values = {
      accessToken: encryptToken(token.access_token),
      expiresAt: toDateFromExpiresIn(token.expires_in),
      metadata: account.metadata,
      providerAccount: account.accountEmail,
      refreshToken: encryptToken(token.refresh_token),
      scope: token.scope,
      tokenType: token.token_type,
    };

    await prisma.connectedIntegration.upsert({
      create: {
        ...values,
        provider: IntegrationProvider.ONEDRIVE,
        userId: options.userId,
      },
      update: values,
      where: {
        userId_provider: {
          provider: IntegrationProvider.ONEDRIVE,
          userId: options.userId,
        },
      },
    });
  }

  static async disconnect(userId: string) {
    await prisma.connectedIntegration
      .delete({
        where: {
          userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
        },
      })
      .catch(() => undefined);
  }

  static async getAuthorizedContext(
    userId: string,
    options?: { resource?: string }
  ): Promise<OneDriveAuthorizedContext> {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
      },
    });
    if (!integration) throw new Error('OneDrive is not connected.');

    let accessToken = integration.accessToken
      ? decryptToken(integration.accessToken)
      : null;
    let expiresAt = integration.expiresAt;
    let scope = integration.scope;
    let refreshToken = decryptToken(integration.refreshToken);
    let tokenType = integration.tokenType;

    if (!accessToken || isExpired(expiresAt) || options?.resource) {
      const token = await exchangeToken({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: getScopeForResource(options?.resource),
      });
      accessToken = token.access_token;
      expiresAt = toDateFromExpiresIn(token.expires_in);
      scope = token.scope ?? scope;
      tokenType = token.token_type ?? tokenType;
      if (token.refresh_token) {
        refreshToken = token.refresh_token;
      }

      if (!options?.resource) {
        if (!accessToken) {
          throw new Error('Microsoft did not return an access token.');
        }
        await prisma.connectedIntegration.update({
          data: {
            accessToken: encryptToken(accessToken),
            expiresAt,
            refreshToken: encryptToken(refreshToken),
            scope,
            tokenType,
          },
          where: {
            userId_provider: {
              provider: IntegrationProvider.ONEDRIVE,
              userId,
            },
          },
        });
      }
    }

    if (!accessToken) {
      throw new Error('Microsoft did not return an access token.');
    }

    return {
      accessToken,
      accountEmail: integration.providerAccount ?? null,
      destination: parseOneDriveDestination(integration.metadata),
      metadata: parseOneDriveMetadata(integration.metadata),
    };
  }

  static async getPickerToken(
    userId: string,
    input?: { resource?: string | null }
  ) {
    const context = await OneDriveOAuthTokenService.getAuthorizedContext(
      userId,
      input?.resource ? { resource: input.resource } : undefined
    );
    return {
      accessToken: context.accessToken,
      accountEmail: context.accountEmail,
      baseUrl:
        context.metadata.pickerBaseUrl ?? 'https://onedrive.live.com/picker',
      expiresAt: null,
    };
  }
}
