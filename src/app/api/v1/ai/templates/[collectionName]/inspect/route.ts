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
 * @swagger
 * /api/v1/ai/templates/{collectionName}/inspect:
 *   get:
 *     tags:
 *       - AI Templates
 *     summary: Inspect detected layout slots and warnings for a template collection
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the template collection
 *     responses:
 *       200:
 *         description: Collection inspection report with categories and detected slot metadata
 *       500:
 *         description: Internal server error
 */
export const GET = withRoles(
  ['TEACHER'],
  async (
    _req,
    _session,
    ctx: { params: Promise<{ collectionName: string }> }
  ) => {
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
 * @swagger
 * /api/v1/ai/templates/{collectionName}/inspect:
 *   patch:
 *     tags:
 *       - AI Templates
 *     summary: Apply reviewer corrections to a category's slots and sync to S3
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the template collection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, edits]
 *             properties:
 *               category:
 *                 type: string
 *               variant:
 *                 type: string
 *                 default: standard
 *               edits:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name]
 *                   properties:
 *                     name:
 *                       type: string
 *                     rename:
 *                       type: string
 *                     type:
 *                       type: string
 *                     desc:
 *                       type: string
 *                     max_chars:
 *                       type: integer
 *                     lines:
 *                       type: integer
 *                     bullet:
 *                       type: boolean
 *                     delete:
 *                       type: boolean
 *                     kind:
 *                       type: string
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     w:
 *                       type: number
 *                     h:
 *                       type: number
 *     responses:
 *       200:
 *         description: Slot edits applied and synchronized successfully
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
export const PATCH = withRoles(
  ['TEACHER'],
  async (
    req,
    _session,
    ctx: { params: Promise<{ collectionName: string }> }
  ) => {
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
