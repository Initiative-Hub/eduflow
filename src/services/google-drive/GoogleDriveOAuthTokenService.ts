import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { fetchGoogleJson, readGoogleJson } from './google-drive-http';
import {
  getGoogleDriveMetadataRecord,
  parseGoogleDriveDestination,
} from './google-drive-types';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
  'profile',
];
const TOKEN_REFRESH_SKEW_MS = 60_000;
const ENCRYPTION_PREFIX = 'v1';

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth credentials are not configured.');
  }
  return { clientId, clientSecret };
}

function getEncryptionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('Encryption secret is not configured.');
  }
  return createHash('sha256').update(secret).digest();
}

function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionSecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(':');
  if (
    version !== ENCRYPTION_PREFIX ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error('Stored Google Drive token format is invalid.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionSecret(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function getExpiresAt(expiresIn?: number) {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
}

export class GoogleDriveOAuthTokenService {
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
      throw new Error('Invalid Google Drive OAuth state.');
    }
  }

  static getAuthorizationUrl(options: { redirectUri: string; state: string }) {
    const { clientId } = getConfig();
    return `${GOOGLE_AUTH_URL}?${new URLSearchParams({
      access_type: 'offline',
      client_id: clientId,
      include_granted_scopes: 'true',
      prompt: 'consent select_account',
      redirect_uri: options.redirectUri,
      response_type: 'code',
      scope: DRIVE_SCOPES.join(' '),
      state: options.state,
    })}`;
  }

  static async connect(options: {
    code: string;
    redirectUri: string;
    userId: string;
  }) {
    const { clientId, clientSecret } = getConfig();
    const token = await readGoogleJson<GoogleTokenResponse>(
      await fetch(GOOGLE_TOKEN_URL, {
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: options.code,
          grant_type: 'authorization_code',
          redirect_uri: options.redirectUri,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
    );
    if (!token.access_token) {
      throw new Error('Google did not return an access token.');
    }
    const existing = await prisma.connectedIntegration.findUnique({
      select: { refreshToken: true },
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId: options.userId,
        },
      },
    });
    const refreshToken = token.refresh_token
      ? encryptToken(token.refresh_token)
      : existing?.refreshToken;
    if (!refreshToken)
      throw new Error('Google did not return a refresh token.');

    const userInfo = await fetchGoogleJson<GoogleUserInfoResponse>(
      GOOGLE_USERINFO_URL,
      token.access_token
    );
    const values = {
      accessToken: encryptToken(token.access_token),
      expiresAt: getExpiresAt(token.expires_in),
      metadata: {
        accountName: userInfo.name ?? null,
        accountPicture: userInfo.picture ?? null,
        googleSubject: userInfo.sub ?? null,
      },
      providerAccount: userInfo.email ?? null,
      refreshToken,
      scope: token.scope,
      tokenType: token.token_type,
    };
    await prisma.connectedIntegration.upsert({
      create: {
        ...values,
        provider: IntegrationProvider.GOOGLE_DRIVE,
        userId: options.userId,
      },
      update: values,
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId: options.userId,
        },
      },
    });
  }

  static async disconnect(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      select: { accessToken: true, refreshToken: true },
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    if (!integration) return;
    const storedToken = integration.refreshToken ?? integration.accessToken;
    if (storedToken) {
      await fetch(GOOGLE_REVOKE_URL, {
        body: new URLSearchParams({ token: decryptToken(storedToken) }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }).catch(() => undefined);
    }
    await prisma.connectedIntegration.delete({
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
  }

  static async getAccessTokenDetails(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    if (!integration) throw new Error('Google Drive is not connected.');

    const common = {
      accountEmail: integration.providerAccount ?? null,
      destination: parseGoogleDriveDestination(integration.metadata),
      metadata: getGoogleDriveMetadataRecord(integration.metadata),
    };
    if (
      integration.accessToken &&
      integration.expiresAt &&
      integration.expiresAt.getTime() - TOKEN_REFRESH_SKEW_MS > Date.now()
    ) {
      return {
        ...common,
        accessToken: decryptToken(integration.accessToken),
        expiresAt: integration.expiresAt,
      };
    }

    const { clientId, clientSecret } = getConfig();
    const token = await readGoogleJson<GoogleTokenResponse>(
      await fetch(GOOGLE_TOKEN_URL, {
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: decryptToken(integration.refreshToken),
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
    );
    if (!token.access_token) {
      throw new Error('Google did not return an access token.');
    }
    const expiresAt = getExpiresAt(token.expires_in);
    await prisma.connectedIntegration.update({
      data: {
        accessToken: encryptToken(token.access_token),
        expiresAt,
        scope: token.scope ?? integration.scope,
        tokenType: token.token_type ?? integration.tokenType,
      },
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    return { ...common, accessToken: token.access_token, expiresAt };
  }

  static async getPickerToken(userId: string) {
    const token =
      await GoogleDriveOAuthTokenService.getAccessTokenDetails(userId);
    return {
      accessToken: token.accessToken,
      accountEmail: token.accountEmail,
      expiresAt: token.expiresAt,
    };
  }
}
