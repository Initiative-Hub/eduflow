import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const routeParamsSchema = z.object({
  fileId: z.string().uuid(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(180).optional(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: 'At least one field is required',
  });

export const PATCH = withAuth(async (req, session, context) => {
  try {
    const params = routeParamsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ message: 'Invalid file id' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await StorageService.updateEntry({
      userId: session.user.id,
      fileId: params.data.fileId,
      name: parsed.data.name,
      parentId: parsed.data.parentId,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (
      error?.message === 'File not found' ||
      error?.message === 'Parent folder not found'
    ) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (
      error?.message === 'An item with this name already exists' ||
      error?.message === 'Cannot move a folder inside itself'
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
