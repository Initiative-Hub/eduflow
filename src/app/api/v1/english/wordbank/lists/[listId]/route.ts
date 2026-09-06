import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { SavedVocabularyService } from '@/services/english/SavedVocabularyService';

const paramsSchema = z.object({
  listId: z.string().uuid(),
});

const updateListBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  colorCode: z.string().trim().max(80).nullable().optional(),
});

function wordbankErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Could not update Word List';
  const status = message.includes('not found') ? 404 : 400;

  return NextResponse.json({ message }, { status });
}

/**
 * @swagger
 * /api/v1/english/wordbank/lists/{listId}:
 *   patch:
 *     tags:
 *       - English
 *     summary: Update a vocabulary list
 *     security:
 *       - SessionCookie: []
 */
export const PATCH = withAuth(async (req, sessionData, { params }) => {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsedParams.error.flatten() },
      { status: 400 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsedBody = updateListBodySchema.safeParse(raw);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const list = await SavedVocabularyService.updateList(
      sessionData.user.id,
      parsedParams.data.listId,
      parsedBody.data
    );

    return NextResponse.json({ list });
  } catch (error) {
    return wordbankErrorResponse(error);
  }
});

/**
 * @swagger
 * /api/v1/english/wordbank/lists/{listId}:
 *   delete:
 *     tags:
 *       - English
 *     summary: Delete a vocabulary list
 *     security:
 *       - SessionCookie: []
 */
export const DELETE = withAuth(async (_req, sessionData, { params }) => {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsedParams.error.flatten() },
      { status: 400 }
    );
  }

  const result = await SavedVocabularyService.deleteList(
    sessionData.user.id,
    parsedParams.data.listId
  );

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { message: 'Word List not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
});
