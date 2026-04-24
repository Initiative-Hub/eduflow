import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const uploadMetaSchema = z.object({
  fileId: z.string().uuid().optional(),
  parentId: z.string().uuid().nullable().optional(),
  path: z.string().trim().max(200).optional(),
});

export const POST = withAuth(async (req, session) => {
  try {
    const formData = await req.formData();
    const input = formData.get('file');

    if (!(input instanceof File)) {
      return NextResponse.json(
        { message: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const parsed = uploadMetaSchema.safeParse({
      fileId: formData.get('fileId') || undefined,
      parentId: formData.get('parentId') || undefined,
      path: formData.get('path') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const fileBuffer = new Uint8Array(await input.arrayBuffer());
    const contentType = input.type || 'application/octet-stream';

    const uploaded = parsed.data.fileId
      ? await StorageService.uploadPreparedFile({
          userId: session.user.id,
          fileId: parsed.data.fileId,
          contentType,
          body: fileBuffer,
        })
      : await StorageService.uploadFileDirect({
          userId: session.user.id,
          parentId: parsed.data.parentId ?? null,
          path: parsed.data.path,
          fileName: input.name,
          contentType,
          fileSize: input.size,
          body: fileBuffer,
        });

    return NextResponse.json({ data: uploaded }, { status: 201 });
  } catch (error: any) {
    if (
      error?.message === 'File not found' ||
      error?.message === 'Parent folder not found'
    ) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
