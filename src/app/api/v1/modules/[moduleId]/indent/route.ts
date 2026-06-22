import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { type AuthHandler, withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/prisma';

// ─── Validation ──────────────────────────────────────────────────────────────

const routeParamsSchema = z.object({
  moduleId: z.string().min(1),
});

const indentBodySchema = z.object({
  itemId: z.string().min(1),
  indent: z.number().int().min(0).max(2),
});

// ─── Item Layout Type ────────────────────────────────────────────────────────

interface ItemLayoutEntry {
  id: string;
  orderIndex: number;
  indent: number;
}

// ─── PATCH /api/v1/modules/:moduleId/indent ──────────────────────────────────

/**
 * @swagger
 * /api/v1/modules/{moduleId}/indent:
 *   patch:
 *     tags:
 *       - Modules
 *     summary: Persist indent level change for a lesson or quiz within a module
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
 *               itemId:
 *                 type: string
 *               indent:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2
 *     responses:
 *       200:
 *         description: Indent updated successfully
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
const handler: AuthHandler = async (req, _sessionData, { params }) => {
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
    const parsedBody = indentBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request payload',
        400,
        parsedBody.error.format()
      );
    }

    const { itemId, indent } = parsedBody.data;

    // Update the indent in the existing layout
    const existingLayout =
      (moduleRecord.itemLayout as unknown as ItemLayoutEntry[]) || [];
    const existingEntry = existingLayout.find((e) => e.id === itemId);

    let newLayout: ItemLayoutEntry[];
    if (existingEntry) {
      // Update existing entry
      newLayout = existingLayout.map((e) =>
        e.id === itemId ? { ...e, indent } : e
      );
    } else {
      // Add new entry (item not yet in layout)
      newLayout = [...existingLayout, { id: itemId, orderIndex: 0, indent }];
    }

    // Persist the updated layout
    await prisma.module.update({
      where: { id: moduleId },
      data: {
        itemLayout: newLayout as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ message: 'Indent updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating indent:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
};

export const PATCH = withAuth(handler);
