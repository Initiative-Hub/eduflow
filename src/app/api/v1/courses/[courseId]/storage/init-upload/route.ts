import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';
import { StorageService } from '@/services/StorageService';

const initUploadSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  path: z.string().optional(),
});

export const POST = withAuth(async (req, session, { params }) => {
  try {
    const { courseId } = await params;
    const body = await req.json();
    const parsed = initUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const upload = await CourseService.initializeUpload({
      userId: session.user.id,
      courseId,
      parentId: parsed.data.parentId,
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      fileSize: parsed.data.fileSize,
      path: parsed.data.path,
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
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
