import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const createFolderSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(180),
});

export const POST = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = createFolderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const folder = await StorageService.createFolder({
      userId: session.user.id,
      parentId: parsed.data.parentId ?? null,
      name: parsed.data.name,
    });

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'Parent folder not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error?.message === 'An item with this name already exists') {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
