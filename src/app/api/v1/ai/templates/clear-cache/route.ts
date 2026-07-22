import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/ai/templates/clear-cache:
 *   post:
 *     tags:
 *       - AI Templates
 *     summary: Invalidate cached slide template previews
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionName:
 *                 type: string
 *                 description: Optional specific template collection name to invalidate
 *     responses:
 *       200:
 *         description: Cache invalidated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const POST = withRoles(['TEACHER'], async (req: Request) => {
  try {
    let collectionName: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.collectionName === 'string') {
        collectionName = body.collectionName;
      }
    } catch {
      // Body is optional
    }

    SlideService.clearCache(collectionName);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Clear cache error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to clear templates cache',
      500
    );
  }
});
