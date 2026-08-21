import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/v1/ai/templates/{collectionName}/inspect/{category}/overlay
 * The category's slide with every detected slot outlined and labelled (SVG).
 */
export const GET = withRoles(
  ['TEACHER'],
  async (
    req,
    _session,
    ctx: { params: Promise<{ collectionName: string; category: string }> }
  ) => {
    try {
      const { collectionName, category } = await ctx.params;
      const params = new URL(req.url).searchParams;
      const variant = params.get('variant') || 'standard';
      const boxes = params.get('boxes') !== 'false';
      const editable = params.get('editable') === 'true';
      return NextResponse.json(
        await SlideService.getTemplateSlotOverlay(
          collectionName,
          category,
          variant,
          boxes,
          editable
        ),
        { status: 200 }
      );
    } catch (error) {
      console.error('Slot overlay error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to render overlay', 500);
    }
  }
);
