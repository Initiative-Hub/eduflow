import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

// ─── Validation ──────────────────────────────────────────────────────────────

const routeParamsSchema = z.object({
  moduleId: z.string().min(1),
});

const reorderBodySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      orderIndex: z.number().int().min(0),
    })
  ),
});

// ─── Item Layout Type ────────────────────────────────────────────────────────

interface ItemLayoutEntry {
  id: string;
  orderIndex: number;
  indent: number;
}

// ─── PATCH /api/v1/modules/:moduleId/order ───────────────────────────────────

/**
 * @swagger
 * /api/v1/modules/{moduleId}/order:
 *   patch:
 *     tags:
 *       - Modules
 *     summary: Persist drag-and-drop reorder of lessons and quizzes within a module
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderIndex:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
export const PATCH = withAuth(async (req, _sessionData, { params }) => {
  try {
    const resolvedParams = await params;
    const parsedParams = routeParamsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid module ID',
        400,
        parsedParams.error.format()
      );
    }

    const { moduleId } = parsedParams.data;

    // Verify module exists and get current layout
    const moduleRecord = await prisma.module.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
        course: { deletedAt: null },
      },
      select: { id: true, itemLayout: true },
    });

    if (!moduleRecord) {
      return errorResponse('MODULE_NOT_FOUND', 'Module not found', 404);
    }

    // Parse and validate body
    const body = await req.json();
    const parsedBody = reorderBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request payload',
        400,
        parsedBody.error.format()
      );
    }

    const { items } = parsedBody.data;

    // Merge with existing layout to preserve indent values
    const existingLayout =
      (moduleRecord.itemLayout as unknown as ItemLayoutEntry[]) || [];
    const indentMap = new Map(existingLayout.map((e) => [e.id, e.indent]));

    const newLayout: ItemLayoutEntry[] = items.map((item) => ({
      id: item.id,
      orderIndex: item.orderIndex,
      indent: indentMap.get(item.id) ?? 0,
    }));

    // Persist the updated layout
    await prisma.module.update({
      where: { id: moduleId },
      data: {
        itemLayout: newLayout as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ message: 'Order updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating module order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
