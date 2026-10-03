import {
  type AccountInfo,
  InteractionRequiredAuthError,
  InteractionRequiredAuthErrorCodes,
} from '@azure/msal-node';
import type { Client } from '@microsoft/microsoft-graph-client';
import { IntegrationProvider } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  decryptCloudDriveToken,
  encryptCloudDriveToken,
} from '@/services/cloud-drive/token-encryption';
import {
  OneDriveAuthorizationError,
  type OneDriveAuthorizationDiagnostics,
} from './OneDriveAuthorizationError';
import {
  getAccountMetadata as getMsalAccountMetadata,
  OneDriveMicrosoftSdkAdapter,
} from './OneDriveMicrosoftSdkAdapter';
import { resolvePickerTokenTarget } from './OneDriveTokenTarget';
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

const INTERACTION_REQUIRED_CODES = new Set<string>(
  Object.values(InteractionRequiredAuthErrorCodes)
);
const INTERACTION_REQUIRED_SUBERRORS = new Set([
  'message_only',
  'additional_action',
  'basic_action',
  'user_password_expired',
  'consent_required',
  'bad_token',
  'ui_not_allowed',
  'interrupted_user',
]);

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

function readMicrosoftErrorDiagnostics(
  error: unknown
): OneDriveAuthorizationDiagnostics {
  if (!error || typeof error !== 'object') {
    return {
      correlationId: null,
      errorCode: null,
      errorNo: null,
      subError: null,
    };
  }
  const record = error as {
    correlationId?: unknown;
    errorCode?: unknown;
    errorNo?: unknown;
    subError?: unknown;
  };
  return {
    correlationId:
      typeof record.correlationId === 'string' ? record.correlationId : null,
    errorCode: typeof record.errorCode === 'string' ? record.errorCode : null,
    errorNo: typeof record.errorNo === 'string' ? record.errorNo : null,
    subError: typeof record.subError === 'string' ? record.subError : null,
  };
}

function isInteractionRequired(error: unknown) {
  if (error instanceof InteractionRequiredAuthError) return true;
  const { errorCode, subError } = readMicrosoftErrorDiagnostics(error);
  return Boolean(
    (errorCode && INTERACTION_REQUIRED_CODES.has(errorCode)) ||
      (subError && INTERACTION_REQUIRED_SUBERRORS.has(subError))
  );
}

function isPickerInteractionRequired(error: unknown) {
  if (isInteractionRequired(error)) return true;
  return readMicrosoftErrorDiagnostics(error).errorCode === 'invalid_grant';
}

function logMicrosoftFailure(operation: string, error: unknown) {
  const diagnostics = readMicrosoftErrorDiagnostics(error);
  console.error('OneDrive Microsoft authorization failed.', {
    correlationId: diagnostics.correlationId,
    errorCode: diagnostics.errorCode,
    errorNo: diagnostics.errorNo,
    operation,
    subError: diagnostics.subError,
  });
}

function providerError(operation: string, error: unknown) {
  const diagnostics = readMicrosoftErrorDiagnostics(error);
  logMicrosoftFailure(operation, error);
  return new OneDriveAuthorizationError(
    'ONEDRIVE_PROVIDER_ERROR',
    'Microsoft could not complete the OneDrive authorization request.',
    diagnostics
  );
}

async function getMicrosoftAccountMetadata(graph: Client) {
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

function getSdkAdapter(integration?: { tokenCache?: string | null }) {
  return OneDriveMicrosoftSdkAdapter.createWithCache(
    decryptOptionalToken(integration?.tokenCache)
  );
}

function reconnectRequired(
  message = 'OneDrive session expired. Reconnect OneDrive.'
) {
  return new OneDriveAuthorizationError('ONEDRIVE_RECONNECT_REQUIRED', message);
}

function accountsMatch(options: {
  account: AccountInfo | null;
  accountEmail: string | null;
  metadata: ReturnType<typeof parseOneDriveMetadata>;
}) {
  const { account, accountEmail, metadata } = options;
  if (!account) return false;
  if (metadata.msalHomeAccountId && account.homeAccountId) {
    return metadata.msalHomeAccountId === account.homeAccountId;
  }
  if (metadata.msalLocalAccountId && account.localAccountId) {
    return metadata.msalLocalAccountId === account.localAccountId;
  }
  if (accountEmail && account.username) {
    return accountEmail.toLowerCase() === account.username.toLowerCase();
  }
  return false;
}

export class OneDriveOAuthTokenService {
  static async getAuthorizationUrl(options: {
    redirectUri: string;
    state: string;
  }) {
    return OneDriveMicrosoftSdkAdapter.getAuthorizationUrl(options);
  }

  static async getPickerAuthorizationUrl(options: {
    redirectUri: string;
    state: string;
    userId: string;
  }) {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: {
          provider: IntegrationProvider.ONEDRIVE,
          userId: options.userId,
        },
      },
    });
    if (!integration) {
      throw new OneDriveAuthorizationError(
        'ONEDRIVE_NOT_CONNECTED',
        'OneDrive is not connected.'
      );
    }
    if (!integration.tokenCache) throw reconnectRequired();

    const metadata = parseOneDriveMetadata(integration.metadata);
    const target = resolvePickerTokenTarget(metadata);
    try {
      return await OneDriveMicrosoftSdkAdapter.getAuthorizationUrl({
        loginHint: integration.providerAccount,
        prompt: 'consent',
        redirectUri: options.redirectUri,
        state: options.state,
        target,
      });
    } catch (error) {
      throw providerError('picker_authorization_url', error);
    }
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
    const sdk = getSdkAdapter();
    const token = await sdk.exchangeCode({
      code: options.code,
      redirectUri: options.redirectUri,
      target: { kind: 'graph' },
    });
    const account = await getMicrosoftAccountMetadata(
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

  static async authorizePicker(options: {
    code: string;
    redirectUri: string;
    userId: string;
  }) {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: {
          provider: IntegrationProvider.ONEDRIVE,
          userId: options.userId,
        },
      },
    });
    if (!integration) {
      throw new OneDriveAuthorizationError(
        'ONEDRIVE_NOT_CONNECTED',
        'OneDrive is not connected.'
      );
    }
    if (!integration.tokenCache) throw reconnectRequired();

    const metadata = parseOneDriveMetadata(integration.metadata);
    const target = resolvePickerTokenTarget(metadata);
    const sdk = getSdkAdapter(integration);
    let token: Awaited<ReturnType<typeof sdk.exchangeCode>>;
    try {
      token = await sdk.exchangeCode({
        code: options.code,
        redirectUri: options.redirectUri,
        target,
      });
    } catch (error) {
      throw providerError('picker_code_exchange', error);
    }

    if (
      !accountsMatch({
        account: token.account,
        accountEmail: integration.providerAccount,
        metadata,
      })
    ) {
      throw new OneDriveAuthorizationError(
        'ONEDRIVE_ACCOUNT_MISMATCH',
        'Authorize the same Microsoft account that is already connected.'
      );
    }

    const tokenCache = sdk.serializeCache();
    await prisma.connectedIntegration.update({
      data: {
        metadata: {
          ...metadata,
          ...getMsalAccountMetadata(token.account),
        },
        tokenCache: tokenCache
          ? encryptToken(tokenCache)
          : integration.tokenCache,
      },
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
    userId: string
  ): Promise<OneDriveAuthorizedContext> {
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
      },
    });
    if (!integration) {
      throw new OneDriveAuthorizationError(
        'ONEDRIVE_NOT_CONNECTED',
        'OneDrive is not connected.'
      );
    }

    const metadata = parseOneDriveMetadata(integration.metadata);
    const sdk = getSdkAdapter(integration);
    const account = await sdk.findAccount({
      homeAccountId: metadata.msalHomeAccountId,
      localAccountId: metadata.msalLocalAccountId,
    });
    let token: Awaited<ReturnType<typeof sdk.acquireTokenSilent>> | null = null;

    if (account) {
      try {
        token = await sdk.acquireTokenSilent({
          account,
          target: { kind: 'graph' },
        });
      } catch (error) {
        if (!isInteractionRequired(error)) {
          throw providerError('graph_silent_token', error);
        }
      }
    }

    if (!token && integration.refreshToken) {
      try {
        token = await sdk.acquireTokenByRefreshToken({
          refreshToken: decryptToken(integration.refreshToken),
          target: { kind: 'graph' },
        });
      } catch (error) {
        if (!isInteractionRequired(error)) {
          throw providerError('graph_refresh_token', error);
        }
      }
    }

    if (!token) throw reconnectRequired();

    const graph = sdk.createGraphClient(token.accessToken);
    const nextMetadata = {
      ...metadata,
      ...getMsalAccountMetadata(token.account ?? account),
    };
    const tokenCache = sdk.serializeCache();
    await prisma.connectedIntegration.update({
      data: {
        accessToken: encryptToken(token.accessToken),
        expiresAt: token.expiresAt,
        metadata: nextMetadata,
        scope: token.scope ?? integration.scope,
        tokenCache: tokenCache
          ? encryptToken(tokenCache)
          : integration.tokenCache,
        tokenType: token.tokenType ?? integration.tokenType,
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
    const integration = await prisma.connectedIntegration.findUnique({
      where: {
        userId_provider: { provider: IntegrationProvider.ONEDRIVE, userId },
      },
    });
    if (!integration) {
      throw new OneDriveAuthorizationError(
        'ONEDRIVE_NOT_CONNECTED',
        'OneDrive is not connected.'
      );
    }
    if (!integration.tokenCache) throw reconnectRequired();

    const metadata = parseOneDriveMetadata(integration.metadata);
    const target = resolvePickerTokenTarget(metadata, input?.resource);
    const sdk = getSdkAdapter(integration);
    const account = await sdk.findAccount({
      homeAccountId: metadata.msalHomeAccountId,
      localAccountId: metadata.msalLocalAccountId,
    });
    if (!account) throw reconnectRequired();

    let token: Awaited<ReturnType<typeof sdk.acquireTokenSilent>>;
    try {
      token = await sdk.acquireTokenSilent({ account, target });
    } catch (error) {
      if (isPickerInteractionRequired(error)) {
        logMicrosoftFailure('picker_silent_token', error);
        throw new OneDriveAuthorizationError(
          'ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED',
          'Microsoft requires additional permission to browse OneDrive folders.'
        );
      }
      throw providerError('picker_silent_token', error);
    }

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
      baseUrl: metadata.pickerBaseUrl!,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    };
  }
}
