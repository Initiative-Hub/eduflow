import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Client } from '@microsoft/microsoft-graph-client';
import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  decryptCloudDriveToken,
  encryptCloudDriveToken,
} from '@/services/cloud-drive/token-encryption';
import {
  getAccountMetadata as getMsalAccountMetadata,
  getScopeForResource,
  OneDriveMicrosoftSdkAdapter,
} from './OneDriveMicrosoftSdkAdapter';
import {
  type OneDriveDestination,
  parseOneDriveDestination,
  parseOneDriveMetadata,
} from './onedrive-types';

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
  graph: Client;
  metadata: ReturnType<typeof parseOneDriveMetadata>;
};

function encryptToken(value: string) {
  return encryptCloudDriveToken(value);
}

function decryptToken(value: string) {
  return decryptCloudDriveToken(value, 'OneDrive');
}

function decryptOptionalToken(value?: string | null) {
  return value ? decryptToken(value) : null;
}

function getPickerBaseUrl(drive: MicrosoftDrive) {
  if (drive.driveType === 'personal') return 'https://onedrive.live.com/picker';
  try {
    return drive.webUrl ? new URL(drive.webUrl).origin : null;
  } catch {
    return null;
  }
}

async function getAccountMetadata(graph: Client) {
  const [profile, drive] = await Promise.all([
    graph
      .api('/me')
      .select('id,displayName,mail,userPrincipalName')
      .get() as Promise<MicrosoftProfile>,
    graph
      .api('/me/drive')
      .select('id,webUrl,driveType')
      .get() as Promise<MicrosoftDrive>,
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

async function getSdkAdapter(integration?: { tokenCache?: string | null }) {
  return OneDriveMicrosoftSdkAdapter.createWithCache(
    decryptOptionalToken(integration?.tokenCache)
  );
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

  static async getAuthorizationUrl(options: {
    redirectUri: string;
    state: string;
  }) {
    return OneDriveMicrosoftSdkAdapter.getAuthorizationUrl(options);
  }

  static async connect(options: {
    code: string;
    redirectUri: string;
    userId: string;
  }) {
    const existing = await prisma.connectedIntegration.findUnique({
      select: { refreshToken: true },
      where: {
        userId_provider: {
          provider: IntegrationProvider.ONEDRIVE,
          userId: options.userId,
        },
      },
    });
    const sdk = await getSdkAdapter();
    const token = await sdk.exchangeCode({
      code: options.code,
      redirectUri: options.redirectUri,
    });
    const account = await getAccountMetadata(
      sdk.createGraphClient(token.accessToken)
    );
    const tokenCache = sdk.serializeCache();
    const values = {
      accessToken: encryptToken(token.accessToken),
      expiresAt: token.expiresAt,
      metadata: {
        ...account.metadata,
        ...getMsalAccountMetadata(token.account),
      },
      providerAccount: account.accountEmail,
      refreshToken: existing?.refreshToken ?? null,
      scope: token.scope,
      tokenCache: tokenCache ? encryptToken(tokenCache) : null,
      tokenType: token.tokenType,
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

    const metadata = parseOneDriveMetadata(integration.metadata);
    const sdk = await getSdkAdapter(integration);
    const account = await sdk.findAccount({
      homeAccountId: metadata.msalHomeAccountId,
      localAccountId: metadata.msalLocalAccountId,
    });
    let token: Awaited<
      ReturnType<OneDriveMicrosoftSdkAdapter['acquireTokenSilent']>
    > | null = null;

    if (account) {
      token = await sdk
        .acquireTokenSilent({
          account,
          resource: options?.resource,
        })
        .catch(() => null);
    }

    if (!token && integration.refreshToken) {
      token = await sdk.acquireTokenByRefreshToken({
        refreshToken: decryptToken(integration.refreshToken),
        resource: options?.resource,
      });
    }

    if (!token) {
      throw new Error('OneDrive session expired. Reconnect OneDrive.');
    }

    const graph = sdk.createGraphClient(token.accessToken);
    const nextMetadata = {
      ...metadata,
      ...getMsalAccountMetadata(token.account ?? account),
    };
    const tokenCache = sdk.serializeCache();
    await prisma.connectedIntegration.update({
      data: {
        metadata: nextMetadata,
        tokenCache: tokenCache
          ? encryptToken(tokenCache)
          : integration.tokenCache,
        ...(options?.resource
          ? {}
          : {
              accessToken: encryptToken(token.accessToken),
              expiresAt: token.expiresAt,
              scope: token.scope ?? getScopeForResource().join(' '),
              tokenType: token.tokenType ?? integration.tokenType,
            }),
      },
      where: {
        userId_provider: {
          provider: IntegrationProvider.ONEDRIVE,
          userId,
        },
      },
    });

    return {
      accessToken: token.accessToken,
      accountEmail: integration.providerAccount ?? null,
      destination: parseOneDriveDestination(nextMetadata),
      graph,
      metadata: nextMetadata,
    };
  }

  static async getPickerToken(
    userId: string,
    input?: { resource?: string | null }
  ) {
    const context =
      await OneDriveOAuthTokenService.getAuthorizedContext(userId);
    const baseUrl =
      context.metadata.pickerBaseUrl ?? 'https://onedrive.live.com/picker';
    const resourceContext =
      await OneDriveOAuthTokenService.getAuthorizedContext(userId, {
        resource: input?.resource ?? baseUrl,
      });
    return {
      accessToken: resourceContext.accessToken,
      accountEmail: context.accountEmail,
      baseUrl,
      expiresAt: null,
    };
  }
}
