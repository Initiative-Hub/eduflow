import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';
import {
  assertOneDriveOAuthState,
  buildIntegrationReturnUrl,
  getOneDriveRedirectUri,
  ONEDRIVE_OAUTH_CALLBACK_PATH,
  ONEDRIVE_OAUTH_RETURN_COOKIE,
  ONEDRIVE_OAUTH_STATE_COOKIE,
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

export const GET = withAuth(async (req, session) => {
  const cookieStore = await cookies();
  const returnTo = sanitizeReturnTo(
    cookieStore.get(ONEDRIVE_OAUTH_RETURN_COOKIE)?.value
  );

  try {
    const url = new URL(req.url);
    const error = url.searchParams.get('error');
    if (error) {
      throw new Error(error);
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = cookieStore.get(ONEDRIVE_OAUTH_STATE_COOKIE)?.value;

    if (!code || !state || !expectedState) {
      throw new Error('OneDrive OAuth callback is missing required data.');
    }

    assertOneDriveOAuthState(state, expectedState, session.user.id);
    await OneDriveOAuthTokenService.connect({
      code,
      redirectUri: getOneDriveRedirectUri(req),
      userId: session.user.id,
    });

    const response = NextResponse.redirect(
      buildIntegrationReturnUrl(req, returnTo, 'oneDrive', 'connected')
    );
    clearOAuthCookies(response);
    return response;
  } catch {
    const response = NextResponse.redirect(
      buildIntegrationReturnUrl(req, returnTo, 'oneDrive', 'error')
    );
    clearOAuthCookies(response);
    return response;
  }
});
