import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';

/**
 * @swagger
 * /api/v1/integrations/onedrive/status:
 *   get:
 *     summary: Get the connected OneDrive account and export destination
 *     description: Returns connection state, account email, and the current destination under data.
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
export const GET = withAuth(async (_req, session) => {
  try {
    const status = await OneDriveDestinationService.getStatus(session.user.id);

    return NextResponse.json({ data: status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not load OneDrive status.' },
      { status: 500 }
    );
  }
});
