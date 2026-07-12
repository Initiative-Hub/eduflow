import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

/**
 * @swagger
 * /api/v1/ai/templates/{collectionName}/categories:
 *   get:
 *     tags:
 *       - AI Templates
 *     summary: List layout-type category names for a template collection
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category names for the collection
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withRoles(
  ['TEACHER'],
  async (
    _req: Request,
    _session,
    { params }: { params: Promise<{ collectionName: string }> }
  ) => {
    try {
      const { collectionName } = await params;
      const data = await SlideService.getTemplateCategories(collectionName);
      return NextResponse.json(data);
    } catch (error) {
      console.error('Collection categories error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to fetch collection categories',
        500
      );
    }
  }
);
