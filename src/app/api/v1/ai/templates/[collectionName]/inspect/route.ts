import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { SlideService } from '@/services/SlideService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const slotEditsSchema = z.object({
  category: z.string().min(1),
  variant: z.string().default('standard'),
  edits: z
    .array(
      z.object({
        name: z.string().min(1),
        rename: z.string().optional(),
        type: z.string().optional(),
        desc: z.string().optional(),
        max_chars: z.number().int().positive().optional(),
        lines: z.number().int().positive().optional(),
        bullet: z.boolean().optional(),
        delete: z.boolean().optional(),
        kind: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        w: z.number().positive().optional(),
        h: z.number().positive().optional(),
      })
    )
    .min(1),
});

/**
 * GET /api/v1/ai/templates/{collectionName}/inspect
 * Detected slots + warnings per category, for the template review screen.
 */
export const GET = withRoles(
  ['TEACHER'],
  async (_req, _session, ctx: { params: Promise<{ collectionName: string }> }) => {
    try {
      const { collectionName } = await ctx.params;
      return NextResponse.json(
        await SlideService.inspectTemplate(collectionName),
        { status: 200 }
      );
    } catch (error) {
      console.error('Inspect template error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to inspect template', 500);
    }
  }
);

/**
 * PATCH /api/v1/ai/templates/{collectionName}/inspect
 * Apply reviewer corrections to a category's slots, then sync them to S3.
 */
export const PATCH = withRoles(
  ['TEACHER'],
  async (req, _session, ctx: { params: Promise<{ collectionName: string }> }) => {
    try {
      const { collectionName } = await ctx.params;
      const parsed = slotEditsSchema.safeParse(await req.json());
      if (!parsed.success) {
        return errorResponse('BAD_REQUEST', 'Invalid slot edits', 400);
      }
      return NextResponse.json(
        await SlideService.updateTemplateSlots(collectionName, parsed.data),
        { status: 200 }
      );
    } catch (error) {
      console.error('Update template slots error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update slots', 500);
    }
  }
);
