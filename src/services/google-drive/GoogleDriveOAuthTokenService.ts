import { randomBytes, timingSafeEqual } from 'node:crypto';
import { type Auth, type drive_v3, google } from 'googleapis';
import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  decryptCloudDriveToken,
  encryptCloudDriveToken,
} from '@/services/cloud-drive/token-encryption';
import {
  type GoogleDriveDestination,
  getGoogleDriveMetadataRecord,
  parseGoogleDriveDestination,
} from './google-drive-types';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
  'profile',
];
const TOKEN_REFRESH_SKEW_MS = 60_000;

type GoogleDriveMetadata = ReturnType<typeof getGoogleDriveMetadataRecord>;

export type GoogleDriveAuthorizedContext = {
  accountEmail: string | null;
  auth: Auth.OAuth2Client;
  destination: GoogleDriveDestination | null;
  drive: drive_v3.Drive;
  metadata: GoogleDriveMetadata;
};

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth credentials are not configured.');
  }
  return { clientId, clientSecret };
}

function createOAuthClient(redirectUri?: string) {
  const { clientId, clientSecret } = getConfig();
  return new google.auth.OAuth2({
    clientId,
    clientSecret,
    eagerRefreshThresholdMillis: TOKEN_REFRESH_SKEW_MS,
    redirectUri,
  });
}

const encryptToken = encryptCloudDriveToken;
const decryptToken = (value: string) =>
  decryptCloudDriveToken(value, 'Google Drive');

function toDate(expiryDate?: number | null) {
  return expiryDate ? new Date(expiryDate) : null;
}

function hasCredentialChanged(
  integration: {
    accessToken: string | null;
    expiresAt: Date | null;
    scope: string | null;
    tokenType: string | null;
  },
  credentials: Auth.Credentials
) {
  return (
    Boolean(credentials.access_token) &&
    (credentials.access_token !==
      (integration.accessToken
        ? decryptToken(integration.accessToken)
        : null) ||
      credentials.expiry_date !== integration.expiresAt?.getTime() ||
      (credentials.scope ?? integration.scope) !== integration.scope ||
      (credentials.token_type ?? integration.tokenType) !==
        integration.tokenType)
  );
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
    return createOAuthClient(options.redirectUri).generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent select_account',
      scope: DRIVE_SCOPES,
      state: options.state,
    });
  }

  static async connect(options: {
    code: string;
    redirectUri: string;
    userId: string;
  }) {
    const auth = createOAuthClient(options.redirectUri);
    const { tokens } = await auth.getToken({
      code: options.code,
      redirect_uri: options.redirectUri,
    });
    if (!tokens.access_token) {
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
    const refreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existing?.refreshToken;
    if (!refreshToken) {
      throw new Error('Google did not return a refresh token.');
    }

    auth.setCredentials(tokens);
    const userInfo = (
      await google.oauth2({ auth, version: 'v2' }).userinfo.get()
    ).data;
    const values = {
      accessToken: encryptToken(tokens.access_token),
      expiresAt: toDate(tokens.expiry_date),
      metadata: {
        accountName: userInfo.name ?? null,
        accountPicture: userInfo.picture ?? null,
        googleSubject: userInfo.id ?? null,
      },
      providerAccount: userInfo.email ?? null,
      refreshToken,
      scope: tokens.scope,
      tokenType: tokens.token_type,
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
      await createOAuthClient()
        .revokeToken(decryptToken(storedToken))
        .catch(() => undefined);
    }
    await prisma.connectedIntegration.delete({
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
  }

  static async getAuthorizedContext(
    userId: string
  ): Promise<GoogleDriveAuthorizedContext> {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: { provider: IntegrationProvider.GOOGLE_DRIVE, userId },
      },
    });
    if (!integration) throw new Error('Google Drive is not connected.');

    const auth = createOAuthClient();
    auth.setCredentials({
      access_token: integration.accessToken
        ? decryptToken(integration.accessToken)
        : null,
      expiry_date: integration.expiresAt?.getTime() ?? null,
      refresh_token: decryptToken(integration.refreshToken),
      scope: integration.scope ?? undefined,
      token_type: integration.tokenType ?? undefined,
    });
    const accessToken = await auth.getAccessToken();
    if (!accessToken.token || !auth.credentials.access_token) {
      throw new Error('Google did not return an access token.');
    }

    if (hasCredentialChanged(integration, auth.credentials)) {
      await prisma.connectedIntegration.update({
        data: {
          accessToken: encryptToken(auth.credentials.access_token),
          expiresAt: toDate(auth.credentials.expiry_date),
          scope: auth.credentials.scope ?? integration.scope,
          tokenType: auth.credentials.token_type ?? integration.tokenType,
        },
        where: {
          userId_provider: {
            provider: IntegrationProvider.GOOGLE_DRIVE,
            userId,
          },
        },
      });
    }

    return {
      accountEmail: integration.providerAccount ?? null,
      auth,
      destination: parseGoogleDriveDestination(integration.metadata),
      drive: google.drive({ auth, version: 'v3' }),
      metadata: getGoogleDriveMetadataRecord(integration.metadata),
    };
  }

  static async getPickerToken(userId: string) {
    const context =
      await GoogleDriveOAuthTokenService.getAuthorizedContext(userId);
    return {
      accessToken: context.auth.credentials.access_token as string,
      accountEmail: context.accountEmail,
      expiresAt: toDate(context.auth.credentials.expiry_date),
    };
  }
}
