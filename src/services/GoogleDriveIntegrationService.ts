import { createHash, randomBytes } from 'node:crypto';
import { createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import { IntegrationProvider, type Prisma } from '@/generated/prisma';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { prisma } from '@/lib/prisma';
import { StorageService } from '@/services/StorageService';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_PROFILE_SCOPES = ['openid', 'email', 'profile'];
const DRIVE_SCOPES = [GOOGLE_DRIVE_SCOPE, ...GOOGLE_PROFILE_SCOPES];
const TOKEN_REFRESH_SKEW_MS = 60_000;
const ENCRYPTION_PREFIX = 'v1';
const GOOGLE_WORKSPACE_EXPORTS: Record<
  string,
  { extension: string; mimeType: string }
> = {
  'application/vnd.google-apps.document': {
    extension: 'pdf',
    mimeType: 'application/pdf',
  },
  'application/vnd.google-apps.drawing': {
    extension: 'png',
    mimeType: 'image/png',
  },
  'application/vnd.google-apps.presentation': {
    extension: 'pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  'application/vnd.google-apps.spreadsheet': {
    extension: 'xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

type GoogleDriveFileMetadata = {
  capabilities?: {
    canDownload?: boolean;
  };
  exportLinks?: Record<string, string>;
  id: string;
  mimeType?: string;
  name?: string;
  size?: string;
};

function getGoogleDriveConfig() {
  const clientId =
    process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth credentials are not configured.');
  }

  return {
    clientId,
    clientSecret,
  };
}

function getEncryptionSecret() {
  const secret =
    process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error('Google Drive token encryption key is not configured.');
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
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
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

  const iv = Buffer.from(ivValue, 'base64url');
  const tag = Buffer.from(tagValue, 'base64url');
  const encrypted = Buffer.from(encryptedValue, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionSecret(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8'
  );
}

function getExpiresAt(expiresIn?: number) {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

function appendExtension(name: string, extension: string) {
  const suffix = `.${extension}`;
  return name.toLowerCase().endsWith(suffix) ? name : `${name}${suffix}`;
}

function assertValidState(receivedState: string, expectedState: string) {
  const received = Buffer.from(receivedState);
  const expected = Buffer.from(expectedState);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new Error('Invalid Google Drive OAuth state.');
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error_description' in data
        ? String(data.error_description)
        : data && typeof data === 'object' && 'error' in data
          ? String(data.error)
          : 'Google Drive request failed.';
    throw new Error(message);
  }

  if (!data) {
    throw new Error('Google Drive returned an empty response.');
  }

  return data;
}

async function fetchWithToken<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  return readJsonResponse<T>(response);
}

function buildDriveMetadata(source: {
  exportMimeType?: string;
  googleDriveFileId: string;
  googleDriveMimeType?: string;
  googleDriveName: string;
  importedAt: string;
}) {
  return {
    googleDrive: {
      exportMimeType: source.exportMimeType ?? null,
      fileId: source.googleDriveFileId,
      mimeType: source.googleDriveMimeType ?? null,
      name: source.googleDriveName,
    },
    importedAt: source.importedAt,
    source: 'google_drive',
  } satisfies Prisma.InputJsonValue;
}

export class GoogleDriveIntegrationService {
  static createState() {
    return randomBytes(32).toString('base64url');
  }

  static assertState(receivedState: string, expectedState: string) {
    assertValidState(receivedState, expectedState);
  }

  static getAuthorizationUrl(options: { redirectUri: string; state: string }) {
    const { clientId } = getGoogleDriveConfig();
    const params = new URLSearchParams({
      access_type: 'offline',
      client_id: clientId,
      include_granted_scopes: 'true',
      prompt: 'consent',
      redirect_uri: options.redirectUri,
      response_type: 'code',
      scope: DRIVE_SCOPES.join(' '),
      state: options.state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  static async connect(options: {
    code: string;
    redirectUri: string;
    userId: string;
  }) {
    const { clientId, clientSecret } = getGoogleDriveConfig();
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: options.code,
        grant_type: 'authorization_code',
        redirect_uri: options.redirectUri,
      }),
    });
    const token = await readJsonResponse<GoogleTokenResponse>(response);

    if (!token.access_token) {
      throw new Error('Google did not return an access token.');
    }

    const existing = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId: options.userId,
        },
      },
      select: { refreshToken: true },
    });
    const refreshToken = token.refresh_token
      ? encryptToken(token.refresh_token)
      : existing?.refreshToken;

    if (!refreshToken) {
      throw new Error('Google did not return a refresh token.');
    }

    const userInfo = await fetchWithToken<GoogleUserInfoResponse>(
      GOOGLE_USERINFO_URL,
      token.access_token
    );

    await prisma.connectedIntegration.upsert({
      create: {
        accessToken: encryptToken(token.access_token),
        expiresAt: getExpiresAt(token.expires_in),
        metadata: {
          accountName: userInfo.name ?? null,
          accountPicture: userInfo.picture ?? null,
          googleSubject: userInfo.sub ?? null,
        },
        provider: IntegrationProvider.GOOGLE_DRIVE,
        providerAccount: userInfo.email ?? null,
        refreshToken,
        scope: token.scope,
        tokenType: token.token_type,
        userId: options.userId,
      },
      update: {
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
      },
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId: options.userId,
        },
      },
    });
  }

  static async getStatus(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId,
        },
      },
      select: {
        expiresAt: true,
        metadata: true,
        providerAccount: true,
        scope: true,
        updatedAt: true,
      },
    });

    return {
      accountEmail: integration?.providerAccount ?? null,
      connected: Boolean(integration),
      expiresAt: integration?.expiresAt ?? null,
      metadata: integration?.metadata ?? null,
      scope: integration?.scope ?? null,
      updatedAt: integration?.updatedAt ?? null,
    };
  }

  static async disconnect(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId,
        },
      },
      select: {
        accessToken: true,
        refreshToken: true,
      },
    });

    if (!integration) return;

    const tokenToRevoke = integration.accessToken ?? integration.refreshToken;
    if (tokenToRevoke) {
      const token = decryptToken(tokenToRevoke);
      await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token }),
      }).catch(() => undefined);
    }

    await prisma.connectedIntegration.delete({
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId,
        },
      },
    });
  }

  private static async getAccessTokenDetails(userId: string) {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId,
        },
      },
    });

    if (!integration) {
      throw new Error('Google Drive is not connected.');
    }

    const accountEmail = integration.providerAccount ?? null;

    if (
      integration.accessToken &&
      integration.expiresAt &&
      integration.expiresAt.getTime() - TOKEN_REFRESH_SKEW_MS > Date.now()
    ) {
      return {
        accessToken: decryptToken(integration.accessToken),
        accountEmail,
        expiresAt: integration.expiresAt,
      };
    }

    const { clientId, clientSecret } = getGoogleDriveConfig();
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: decryptToken(integration.refreshToken),
      }),
    });
    const token = await readJsonResponse<GoogleTokenResponse>(response);

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
        userId_provider: {
          provider: IntegrationProvider.GOOGLE_DRIVE,
          userId,
        },
      },
    });

    return {
      accessToken: token.access_token,
      accountEmail,
      expiresAt,
    };
  }

  private static async getAccessToken(userId: string) {
    const token =
      await GoogleDriveIntegrationService.getAccessTokenDetails(userId);

    return token.accessToken;
  }

  static async getPickerToken(userId: string) {
    return GoogleDriveIntegrationService.getAccessTokenDetails(userId);
  }

  static async importFile(options: {
    courseId?: string | null;
    fileId: string;
    parentId?: string | null;
    userId: string;
  }) {
    const accessToken = await GoogleDriveIntegrationService.getAccessToken(
      options.userId
    );
    const metadataParams = new URLSearchParams({
      fields: 'id,name,mimeType,size,capabilities/canDownload,exportLinks',
      supportsAllDrives: 'true',
    });
    const metadata = await fetchWithToken<GoogleDriveFileMetadata>(
      `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(options.fileId)}?${metadataParams.toString()}`,
      accessToken
    );

    if (!metadata.name) {
      throw new Error('Selected Google Drive file is missing a name.');
    }

    const exportTarget = metadata.mimeType
      ? GOOGLE_WORKSPACE_EXPORTS[metadata.mimeType]
      : undefined;
    const isWorkspaceFile = Boolean(
      metadata.mimeType?.startsWith('application/vnd.google-apps.')
    );

    if (isWorkspaceFile && !exportTarget) {
      throw new Error('This Google Drive file type cannot be imported yet.');
    }

    if (!isWorkspaceFile && metadata.capabilities?.canDownload === false) {
      throw new Error('This Google Drive file cannot be downloaded.');
    }

    const declaredSize = metadata.size ? Number(metadata.size) : null;
    if (
      declaredSize !== null &&
      Number.isFinite(declaredSize) &&
      declaredSize > STORAGE_MAX_FILE_SIZE_BYTES
    ) {
      throw new Error('File size exceeds storage upload limit');
    }

    const downloadUrl = exportTarget
      ? `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(metadata.id)}/export?${new URLSearchParams({ mimeType: exportTarget.mimeType }).toString()}`
      : `${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(metadata.id)}?${new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' }).toString()}`;

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Could not download the selected Google Drive file.');
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > STORAGE_MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds storage upload limit');
    }

    const fileName = exportTarget
      ? appendExtension(metadata.name, exportTarget.extension)
      : metadata.name;
    const contentType =
      exportTarget?.mimeType ||
      response.headers.get('content-type') ||
      metadata.mimeType ||
      'application/octet-stream';
    const importedAt = new Date().toISOString();

    return StorageService.createFileFromBytes({
      bytes,
      contentType,
      courseId: options.courseId ?? null,
      fileName,
      metadata: buildDriveMetadata({
        exportMimeType: exportTarget?.mimeType,
        googleDriveFileId: metadata.id,
        googleDriveMimeType: metadata.mimeType,
        googleDriveName: metadata.name,
        importedAt,
      }),
      parentId: options.parentId ?? null,
      userId: options.userId,
    });
  }
}
