import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import {
  AVATAR_MAX_FILE_SIZE_BYTES,
  buildAvatarObjectKey,
  deleteAvatarObject,
  uploadAvatarObject,
} from '@/lib/storage/avatar';
import { UserService } from '@/services/UserService';
import { ALLOWED_CONTENT_TYPES } from '@/utils/file-helper';

const uploadAvatarMetaSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  size: z.number().int().positive().max(AVATAR_MAX_FILE_SIZE_BYTES),
});

export const POST = withAuth([], async (req, session) => {
  try {
    const formData = await req.formData();
    const input = formData.get('file');

    if (!(input instanceof File)) {
      return NextResponse.json(
        { message: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const parsedMeta = uploadAvatarMetaSchema.safeParse({
      fileName: input.name,
      contentType: input.type,
      size: input.size,
    });

    if (!parsedMeta.success) {
      return NextResponse.json(
        {
          message: 'Invalid request payload',
          details: parsedMeta.error.flatten(),
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const { fileName, contentType } = parsedMeta.data;
    const objectKey = buildAvatarObjectKey({
      userId,
      fileName,
      contentType,
    });

    const fileBuffer = new Uint8Array(await input.arrayBuffer());
    await uploadAvatarObject({
      objectKey,
      contentType,
      body: fileBuffer,
    });

    const previousAvatarPath = await UserService.getAvatarPath(userId);
    await UserService.setAvatarPath(userId, objectKey);

    if (previousAvatarPath && previousAvatarPath !== objectKey) {
      try {
        await deleteAvatarObject(previousAvatarPath);
      } catch (error) {
        console.warn('Failed to delete old avatar object:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to upload avatar' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth([], async (_req, session) => {
  const userId = session.user.id;

  try {
    const currentAvatarPath = await UserService.getAvatarPath(userId);

    if (!currentAvatarPath) {
      return NextResponse.json({ success: true });
    }

    await deleteAvatarObject(currentAvatarPath);
    await UserService.setAvatarPath(userId, null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to remove avatar' },
      { status: 500 }
    );
  }
});
