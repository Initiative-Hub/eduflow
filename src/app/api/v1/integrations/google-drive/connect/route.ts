import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';
import {
  createGoogleDriveOAuthState,
  GOOGLE_DRIVE_OAUTH_CALLBACK_PATH,
  GOOGLE_DRIVE_OAUTH_RETURN_COOKIE,
  GOOGLE_DRIVE_OAUTH_STATE_COOKIE,
  getGoogleDriveRedirectUri,
  sanitizeReturnTo,
} from '@/utils/oauth-utils';

export const GET = withAuth(async (req, session) => {
  try {
    const url = new URL(req.url);
    const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'));
    const state = createGoogleDriveOAuthState({ userId: session.user.id });
    const authorizationUrl = GoogleDriveOAuthTokenService.getAuthorizationUrl({
      redirectUri: getGoogleDriveRedirectUri(req),
      state: state.nonce,
    });
    console.log('authorizationUrl', authorizationUrl);
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set(GOOGLE_DRIVE_OAUTH_STATE_COOKIE, state.cookieValue, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: GOOGLE_DRIVE_OAUTH_CALLBACK_PATH,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    response.cookies.set(GOOGLE_DRIVE_OAUTH_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: GOOGLE_DRIVE_OAUTH_CALLBACK_PATH,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not start Google Drive OAuth.' },
      { status: 500 }
    );
  }
});
