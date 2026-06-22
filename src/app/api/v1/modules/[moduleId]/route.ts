import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { ModuleService } from '@/services/ModuleService';

const moduleParamsSchema = z.object({
  moduleId: z.uuid(),
});

/**
 * @swagger
 * /api/v1/modules/{moduleId}:
 *   delete:
 *     tags:
 *       - Modules
 *     summary: Delete a module and its lessons
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Module deleted
 *       400:
 *         description: Invalid module ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
export const DELETE = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = moduleParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid module ID',
        400,
        parsedParams.error.format()
      );
    }

    await ModuleService.deleteModule(
      parsedParams.data.moduleId,
      sessionData.user.id
    );

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';

    if (message === 'Module not found') {
      return errorResponse('MODULE_NOT_FOUND', message, 404);
    }

    if (message.includes('Unauthorized')) {
      return errorResponse('FORBIDDEN', message, 403);
    }

    console.error('Delete module error:', error);

    return errorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred while deleting the module.',
      500
    );
  }
});
