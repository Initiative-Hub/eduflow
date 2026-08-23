import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * DELETE /api/v1/ai/templates/{collectionName}/inspect/{category}
 * Permanently remove one layout from a collection, locally and in S3.
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
