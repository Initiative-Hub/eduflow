import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const listQuerySchema = z.object({
  parentId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * @swagger
 * /api/v1/storage/list:
 *   get:
 *     tags:
 *       - Storage
 *     summary: List files and folders
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Directory items and pagination metadata
 *       400:
 *         description: Invalid query params
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Parent folder not found
 *       500:
 *         description: Internal server error
 *
 */
export const GET = withAuth(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      parentId: searchParams.get('parentId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid query params', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await StorageService.listDirectory({
      userId: session.user.id,
      parentId: parsed.data.parentId,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({
      data: result.items,
      pagination: {
        total: result.total,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Parent folder not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
