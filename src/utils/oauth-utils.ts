import { randomBytes, timingSafeEqual } from 'node:crypto';

const DEFAULT_RETURN_TO = '/settings/integrations';

export const GOOGLE_DRIVE_OAUTH_STATE_COOKIE = 'eduflow_google_drive_state';
export const GOOGLE_DRIVE_OAUTH_RETURN_COOKIE = 'eduflow_google_drive_return';
export const GOOGLE_DRIVE_OAUTH_CALLBACK_PATH =
  '/api/v1/integrations/google-drive/callback';
export const ONEDRIVE_OAUTH_STATE_COOKIE = 'eduflow_onedrive_state';
export const ONEDRIVE_OAUTH_RETURN_COOKIE = 'eduflow_onedrive_return';
export const ONEDRIVE_OAUTH_CALLBACK_PATH =
  '/api/v1/integrations/onedrive/callback';

type GoogleDriveOAuthStateCookie = {
  nonce: string;
  userId: string;
};

export type OneDriveOAuthFlow = 'connect' | 'picker';

type OneDriveOAuthStateCookie = GoogleDriveOAuthStateCookie & {
  flow?: OneDriveOAuthFlow;
};

function assertMatchingValue(
  receivedValue: string,
  expectedValue: string,
  providerName = 'Google Drive'
) {
  const received = Buffer.from(receivedValue);
  const expected = Buffer.from(expectedValue);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new Error(`Invalid ${providerName} OAuth state.`);
  }
}

function parseGoogleDriveOAuthStateCookie(cookieValue: string) {
  return parseOAuthStateCookie(cookieValue, 'Google Drive');
}

function parseOAuthStateCookie(cookieValue: string, providerName: string) {
  try {
    const parsed = JSON.parse(
      cookieValue
    ) as Partial<GoogleDriveOAuthStateCookie>;

    if (!parsed.nonce || !parsed.userId) {
      throw new Error(`Invalid ${providerName} OAuth state.`);
    }

    return parsed as GoogleDriveOAuthStateCookie;
  } catch {
    throw new Error(`Invalid ${providerName} OAuth state.`);
  }
}

export function createGoogleDriveOAuthState({ userId }: { userId: string }) {
  const nonce = randomBytes(32).toString('base64url');
  const cookieValue = JSON.stringify({ nonce, userId });

  return { cookieValue, nonce };
}

export function createOneDriveOAuthState({
  flow = 'connect',
  userId,
}: {
  flow?: OneDriveOAuthFlow;
  userId: string;
}) {
  const nonce = randomBytes(32).toString('base64url');
  const cookieValue = JSON.stringify({ flow, nonce, userId });

  return { cookieValue, nonce };
}

export function assertGoogleDriveOAuthState(
  receivedNonce: string,
  cookieValue: string,
  currentUserId: string
) {
  const expectedState = parseGoogleDriveOAuthStateCookie(cookieValue);

  assertMatchingValue(receivedNonce, expectedState.nonce);

  if (expectedState.userId !== currentUserId) {
    throw new Error('Google Drive OAuth session changed.');
  }
}

export function assertOneDriveOAuthState(
  receivedNonce: string,
  cookieValue: string,
  currentUserId: string
) {
  const expectedState = parseOAuthStateCookie(
    cookieValue,
    'OneDrive'
  ) as OneDriveOAuthStateCookie;

  assertMatchingValue(receivedNonce, expectedState.nonce, 'OneDrive');

  if (expectedState.userId !== currentUserId) {
    throw new Error('OneDrive OAuth session changed.');
  }

  if (
    expectedState.flow !== undefined &&
    expectedState.flow !== 'connect' &&
    expectedState.flow !== 'picker'
  ) {
    throw new Error('Invalid OneDrive OAuth state.');
  }

  return expectedState.flow ?? 'connect';
}

export function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export function getGoogleDriveRedirectUri(req: Request) {
  return (
    process.env.GOOGLE_DRIVE_REDIRECT_URI ||
    `${getBaseUrl(req)}/api/v1/integrations/google-drive/callback`
  );
}

export function getOneDriveRedirectUri(req: Request) {
  return (
    process.env.ONEDRIVE_REDIRECT_URI ||
    `${getBaseUrl(req)}/api/v1/integrations/onedrive/callback`
  );
}

export function sanitizeReturnTo(value?: string | null) {
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const base = new URL('https://eduflow.local');
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return DEFAULT_RETURN_TO;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

export function buildReturnUrl(req: Request, returnTo: string, status: string) {
  const url = new URL(returnTo, getBaseUrl(req));
  url.searchParams.set('googleDrive', status);
  return url;
}

export function buildIntegrationReturnUrl(
  req: Request,
  returnTo: string,
  provider: 'googleDrive' | 'oneDrive',
  status: string
) {
  const url = new URL(returnTo, getBaseUrl(req));
  url.searchParams.set(provider, status);
  return url;
}
