import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { isOneDriveAuthorizationError } from '@/services/onedrive/OneDriveAuthorizationError';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';
import {
  assertOneDriveOAuthState,
  buildIntegrationReturnUrl,
  getOneDriveRedirectUri,
  ONEDRIVE_OAUTH_CALLBACK_PATH,
  ONEDRIVE_OAUTH_RETURN_COOKIE,
  ONEDRIVE_OAUTH_STATE_COOKIE,
  type OneDriveOAuthFlow,
  sanitizeReturnTo,
} from '@/utils/oauth-utils';

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(ONEDRIVE_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: ONEDRIVE_OAUTH_CALLBACK_PATH,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set(ONEDRIVE_OAUTH_RETURN_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: ONEDRIVE_OAUTH_CALLBACK_PATH,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function redirectAfterOAuth(options: {
  flow: OneDriveOAuthFlow;
  reason?: 'consent-canceled';
  req: Request;
  returnTo: string;
  status: string;
}) {
  const url = buildIntegrationReturnUrl(
    options.req,
    options.returnTo,
    'oneDrive',
    options.status
  );
  if (options.reason) url.searchParams.set('oneDriveReason', options.reason);
  const response = NextResponse.redirect(url);
  clearOAuthCookies(response);
  return response;
}

/**
 * @swagger
 * /api/v1/integrations/onedrive/callback:
 *   get:
 *     summary: Complete a OneDrive Graph connection or Picker consent flow
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *     responses:
 *       307:
 *         description: Redirects to the sanitized return path with connected, picker-authorized, picker-error, account-mismatch, or error status.
 */
export const GET = withAuth(async (req, session) => {
  const cookieStore = await cookies();
  const returnTo = sanitizeReturnTo(
    cookieStore.get(ONEDRIVE_OAUTH_RETURN_COOKIE)?.value
  );
  let flow: OneDriveOAuthFlow = 'connect';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = cookieStore.get(ONEDRIVE_OAUTH_STATE_COOKIE)?.value;

    if (!state || !expectedState) {
      throw new Error('OneDrive OAuth callback is missing required data.');
    }

    flow = assertOneDriveOAuthState(state, expectedState, session.user.id);
    const microsoftError = url.searchParams.get('error');
    if (microsoftError) {
      return redirectAfterOAuth({
        flow,
        reason:
          flow === 'picker' && microsoftError === 'access_denied'
            ? 'consent-canceled'
            : undefined,
        req,
        returnTo,
        status: flow === 'picker' ? 'picker-error' : 'error',
      });
    }
    if (!code) {
      throw new Error('OneDrive OAuth callback is missing required data.');
    }

    if (flow === 'picker') {
      await OneDriveOAuthTokenService.authorizePicker({
        code,
        redirectUri: getOneDriveRedirectUri(req),
        userId: session.user.id,
      });
      return redirectAfterOAuth({
        flow,
        req,
        returnTo,
        status: 'picker-authorized',
      });
    }

    await OneDriveOAuthTokenService.connect({
      code,
      redirectUri: getOneDriveRedirectUri(req),
      userId: session.user.id,
    });
    return redirectAfterOAuth({
      flow,
      req,
      returnTo,
      status: 'connected',
    });
  } catch (error) {
    const status =
      flow === 'picker' &&
      isOneDriveAuthorizationError(error) &&
      error.code === 'ONEDRIVE_ACCOUNT_MISMATCH'
        ? 'account-mismatch'
        : flow === 'picker'
          ? 'picker-error'
          : 'error';
    return redirectAfterOAuth({ flow, req, returnTo, status });
  }
});
