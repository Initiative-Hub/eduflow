import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';

const initUploadSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  path: z.string().trim().max(200).optional(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(STORAGE_MAX_FILE_SIZE_BYTES),
});

export const POST = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = initUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const upload = await StorageService.initializeUpload({
      userId: session.user.id,
      parentId: parsed.data.parentId ?? null,
      path: parsed.data.path,
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      fileSize: parsed.data.size,
    });

    return NextResponse.json({
      data: {
        fileId: upload.id,
        path: upload.objectKey,
        bucket: upload.bucket,
        status: upload.status,
        uploadUrl: upload.uploadUrl,
        uploadHeaders: upload.uploadHeaders,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Parent folder not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error?.message === 'File size exceeds inventory upload limit') {
      return NextResponse.json({ message: error.message }, { status: 413 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
