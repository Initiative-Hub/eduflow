import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';
import {
  createOneDriveOAuthState,
  getOneDriveRedirectUri,
  ONEDRIVE_OAUTH_CALLBACK_PATH,
  ONEDRIVE_OAUTH_RETURN_COOKIE,
  ONEDRIVE_OAUTH_STATE_COOKIE,
  sanitizeReturnTo,
} from '@/utils/oauth-utils';

export const GET = withAuth(async (req, session) => {
  try {
    const url = new URL(req.url);
    const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'));
    const state = createOneDriveOAuthState({ userId: session.user.id });
    const authorizationUrl =
      await OneDriveOAuthTokenService.getAuthorizationUrl({
        redirectUri: getOneDriveRedirectUri(req),
        state: state.nonce,
      });
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set(ONEDRIVE_OAUTH_STATE_COOKIE, state.cookieValue, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: ONEDRIVE_OAUTH_CALLBACK_PATH,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    response.cookies.set(ONEDRIVE_OAUTH_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: ONEDRIVE_OAUTH_CALLBACK_PATH,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not start OneDrive OAuth.' },
      { status: 500 }
    );
  }
});
