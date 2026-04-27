import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const shareBatchSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(100),
  expiresIn: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .optional(),
});

export const POST = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = shareBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const signed = await StorageService.createShareUrlsBatch({
      userId: session.user.id,
      fileIds: parsed.data.fileIds,
      expiresInSeconds: parsed.data.expiresIn,
    });

    return NextResponse.json({ data: signed });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
