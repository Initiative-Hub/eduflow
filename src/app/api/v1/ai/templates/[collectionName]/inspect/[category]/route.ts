import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * @swagger
 * /api/v1/ai/templates/{collectionName}/inspect/{category}:
 *   delete:
 *     tags:
 *       - AI Templates
 *     summary: Permanently remove a layout category from a collection locally and in S3
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the template collection
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Template category / layout name to delete
 *     responses:
 *       200:
 *         description: Layout category deleted successfully
 *       400:
 *         description: Bad request (e.g. attempting to delete the only layout left in collection)
 *       500:
 *         description: Internal server error
 */
export const DELETE = withRoles(
  ['TEACHER'],
  async (
    _req,
    _session,
    ctx: { params: Promise<{ collectionName: string; category: string }> }
  ) => {
    try {
      const { collectionName, category } = await ctx.params;
      return NextResponse.json(
        await SlideService.deleteTemplateCategory(collectionName, category),
        { status: 200 }
      );
    } catch (error) {
      // The service refuses to empty a collection, and that refusal is the
      // reviewer's answer — pass it through instead of a generic 500.
      const message =
        error instanceof Error ? error.message : 'Failed to delete layout';
      if (message.includes('only layout left')) {
        return errorResponse('BAD_REQUEST', message, 400);
      }
      console.error('Delete template category error:', error);
      return errorResponse('INTERNAL_ERROR', message, 500);
    }
  }
);
