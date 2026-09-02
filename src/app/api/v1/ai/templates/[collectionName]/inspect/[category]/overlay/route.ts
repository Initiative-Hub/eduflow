import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * @swagger
 * /api/v1/ai/templates/{collectionName}/inspect/{category}/overlay:
 *   get:
 *     tags:
 *       - AI Templates
 *     summary: Render SVG slide overlay with outlined and labelled slot boundaries
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
 *         description: Template category / layout name
 *       - in: query
 *         name: variant
 *         schema:
 *           type: string
 *           default: standard
 *         description: Template variant
 *       - in: query
 *         name: boxes
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to draw slot boundary boxes
 *       - in: query
 *         name: editable
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to inject interactive placeholder data into SVG
 *     responses:
 *       200:
 *         description: Rendered SVG string object
 *       500:
 *         description: Internal server error
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
