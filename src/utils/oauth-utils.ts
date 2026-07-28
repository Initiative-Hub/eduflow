import { randomBytes, timingSafeEqual } from 'node:crypto';

const DEFAULT_RETURN_TO = '/settings/integrations';

export const GOOGLE_DRIVE_OAUTH_STATE_COOKIE = 'eduflow_google_drive_state';
export const GOOGLE_DRIVE_OAUTH_RETURN_COOKIE = 'eduflow_google_drive_return';
export const GOOGLE_DRIVE_OAUTH_CALLBACK_PATH =
  '/api/v1/integrations/google-drive/callback';

type GoogleDriveOAuthStateCookie = {
  nonce: string;
  userId: string;
};

function assertMatchingValue(receivedValue: string, expectedValue: string) {
  const received = Buffer.from(receivedValue);
  const expected = Buffer.from(expectedValue);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new Error('Invalid Google Drive OAuth state.');
  }
}

function parseGoogleDriveOAuthStateCookie(cookieValue: string) {
  try {
    const parsed = JSON.parse(
      cookieValue
    ) as Partial<GoogleDriveOAuthStateCookie>;

    if (!parsed.nonce || !parsed.userId) {
      throw new Error('Invalid Google Drive OAuth state.');
    }

    return parsed as GoogleDriveOAuthStateCookie;
  } catch {
    throw new Error('Invalid Google Drive OAuth state.');
  }
}

export function createGoogleDriveOAuthState({ userId }: { userId: string }) {
  const nonce = randomBytes(32).toString('base64url');
  const cookieValue = JSON.stringify({ nonce, userId });

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

export function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export function getGoogleDriveRedirectUri(req: Request) {
  return (
    process.env.GOOGLE_DRIVE_REDIRECT_URI ||
    `${getBaseUrl(req)}/api/v1/integrations/google-drive/callback`
  );
}

export function sanitizeReturnTo(value?: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_RETURN_TO;
  }

  return value;
}

export function buildReturnUrl(req: Request, returnTo: string, status: string) {
  const url = new URL(returnTo, getBaseUrl(req));
  url.searchParams.set('googleDrive', status);
  return url;
}
