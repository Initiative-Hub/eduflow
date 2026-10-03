import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

/**
 * @swagger
 * /api/v1/integrations/onedrive/disconnect:
 *   delete:
 *     summary: Disconnect OneDrive
 *     description: Deletes the saved integration and returns data.disconnected as true.
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: The operation completed successfully.
 *       401:
 *         description: Authentication is required.
 *       500:
 *         description: The server or provider operation failed.
 */
export const DELETE = withAuth(async (_req, session) => {
  try {
    await OneDriveOAuthTokenService.disconnect(session.user.id);

    return NextResponse.json({ data: { disconnected: true } });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not disconnect OneDrive.' },
      { status: 500 }
    );
  }
});
