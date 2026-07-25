import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';
import {
  assertGoogleDriveOAuthState,
  buildReturnUrl,
  getGoogleDriveRedirectUri,
  GOOGLE_DRIVE_OAUTH_CALLBACK_PATH,
  GOOGLE_DRIVE_OAUTH_RETURN_COOKIE,
  GOOGLE_DRIVE_OAUTH_STATE_COOKIE,
  sanitizeReturnTo,
} from '../oauth-utils';

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(GOOGLE_DRIVE_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: GOOGLE_DRIVE_OAUTH_CALLBACK_PATH,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set(GOOGLE_DRIVE_OAUTH_RETURN_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: GOOGLE_DRIVE_OAUTH_CALLBACK_PATH,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export const GET = withAuth(async (req, session) => {
  const cookieStore = await cookies();
  const returnTo = sanitizeReturnTo(
    cookieStore.get(GOOGLE_DRIVE_OAUTH_RETURN_COOKIE)?.value
  );

  try {
    const url = new URL(req.url);
    const error = url.searchParams.get('error');
    if (error) {
      throw new Error(error);
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = cookieStore.get(
      GOOGLE_DRIVE_OAUTH_STATE_COOKIE
    )?.value;

    if (!code || !state || !expectedState) {
      throw new Error('Google Drive OAuth callback is missing required data.');
    }

    assertGoogleDriveOAuthState(state, expectedState, session.user.id);
    await GoogleDriveOAuthTokenService.connect({
      code,
      redirectUri: getGoogleDriveRedirectUri(req),
      userId: session.user.id,
    });

    const response = NextResponse.redirect(
      buildReturnUrl(req, returnTo, 'connected')
    );
    clearOAuthCookies(response);
    return response;
  } catch {
    const response = NextResponse.redirect(
      buildReturnUrl(req, returnTo, 'error')
    );
    clearOAuthCookies(response);
    return response;
  }
});
