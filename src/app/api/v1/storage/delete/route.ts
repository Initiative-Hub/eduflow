import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const deleteSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(100),
});

export const DELETE = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await StorageService.deleteEntries({
      userId: session.user.id,
      fileIds: parsed.data.fileIds,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
