import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { UserService } from '@/services/UserService';

/**
 * @swagger
 * /api/v1/user/security-info:
 *   get:
 *     tags:
 *       - User
 *     summary: Get current user security information
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Security information
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const GET = withAuth(async (_req, sessionData) => {
  try {
    const userId = sessionData.user.id;
    const userAgent = sessionData.session.userAgent;

    const securityInfo = await UserService.getSecurityInfo(userId, userAgent);
    return NextResponse.json(securityInfo);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
