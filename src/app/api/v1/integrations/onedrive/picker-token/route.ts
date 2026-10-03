import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { oneDrivePickerTokenSchema } from '@/lib/validations/onedrive-export.schema';
import { isOneDriveAuthorizationError } from '@/services/onedrive/OneDriveAuthorizationError';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

/**
 * @swagger
 * /api/v1/integrations/onedrive/picker-token:
 *   post:
 *     summary: Obtain a resource-specific OneDrive Picker token
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *               resource:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Returns the Picker access token and connected Picker base URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     accountEmail:
 *                       type: string
 *                       nullable: true
 *                     baseUrl:
 *                       type: string
 *                       format: uri
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: The request or Picker resource is invalid or unrelated to the connected drive.
 *       409:
 *         description: OneDrive must be connected, reconnected, or explicitly authorized for Picker access.
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
 *                     - ONEDRIVE_PICKER_AUTHORIZATION_REQUIRED
 *                 message:
 *                   type: string
 *       500:
 *         description: Microsoft or the server could not obtain a Picker token.
 */
export const POST = withAuth(async (req, session) => {
  const parsed = oneDrivePickerTokenSchema.safeParse(
    await req.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'ONEDRIVE_INVALID_PICKER_RESOURCE',
        message: 'Invalid OneDrive picker token request.',
      },
      { status: 400 }
    );
  }

  try {
    const token = await OneDriveOAuthTokenService.getPickerToken(
      session.user.id,
      parsed.data
    );

    return NextResponse.json({ data: token });
  } catch (error) {
    if (isOneDriveAuthorizationError(error)) {
      const status =
        error.code === 'ONEDRIVE_INVALID_PICKER_RESOURCE'
          ? 400
          : error.code === 'ONEDRIVE_PROVIDER_ERROR'
            ? 500
            : 409;
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
        message: 'Could not prepare OneDrive Picker.',
      },
      { status: 500 }
    );
  }
});
