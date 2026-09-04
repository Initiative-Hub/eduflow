import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { isOneDriveAuthorizationError } from '@/services/onedrive/OneDriveAuthorizationError';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';
import {
  createOneDriveOAuthState,
  getOneDriveRedirectUri,
  ONEDRIVE_OAUTH_CALLBACK_PATH,
  ONEDRIVE_OAUTH_RETURN_COOKIE,
  ONEDRIVE_OAUTH_STATE_COOKIE,
  sanitizeReturnTo,
} from '@/utils/oauth-utils';

/**
 * @swagger
 * /api/v1/integrations/onedrive/picker-authorize:
 *   get:
 *     summary: Authorize the resource-specific OneDrive Picker permission
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: returnTo
 *         schema:
 *           type: string
 *         description: Sanitized local EduFlow path to return to after consent.
 *     responses:
 *       307:
 *         description: Redirects to Microsoft with explicit Picker consent.
 *       409:
 *         description: OneDrive is not connected or must be reconnected first.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum:
 *                     - ONEDRIVE_NOT_CONNECTED
 *                     - ONEDRIVE_RECONNECT_REQUIRED
 *                 message:
 *                   type: string
 *       500:
 *         description: Microsoft authorization could not be started.
 */
export const GET = withAuth(async (req, session) => {
  try {
    const url = new URL(req.url);
    const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'));
    const state = createOneDriveOAuthState({
      flow: 'picker',
      userId: session.user.id,
    });
    const authorizationUrl =
      await OneDriveOAuthTokenService.getPickerAuthorizationUrl({
        redirectUri: getOneDriveRedirectUri(req),
        state: state.nonce,
        userId: session.user.id,
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
  } catch (error) {
    if (isOneDriveAuthorizationError(error)) {
      const status =
        error.code === 'ONEDRIVE_NOT_CONNECTED' ||
        error.code === 'ONEDRIVE_RECONNECT_REQUIRED'
          ? 409
          : 500;
      return NextResponse.json(
        {
          code: error.code,
          ...(error.code === 'ONEDRIVE_PROVIDER_ERROR' &&
          error.diagnostics &&
          process.env.NODE_ENV !== 'production'
            ? { details: error.diagnostics }
            : {}),
          message: error.message,
        },
        { status }
      );
    }
    return NextResponse.json(
      {
        code: 'ONEDRIVE_PROVIDER_ERROR',
        message: 'Could not start OneDrive Picker authorization.',
      },
      { status: 500 }
    );
  }
});
