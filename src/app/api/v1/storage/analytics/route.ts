import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

/**
 * @swagger
 * /api/v1/storage/analytics:
 *   get:
 *     tags:
 *       - Storage
 *     summary: Get storage analytics for the current user
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Storage analytics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const GET = withAuth(async (req, session) => {
  try {
    const analytics = await StorageService.getAnalytics({
      userId: session.user.id,
    });

    return NextResponse.json({ data: analytics });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
