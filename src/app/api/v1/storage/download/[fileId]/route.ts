import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const routeParamsSchema = z.object({
  fileId: z.string().uuid(),
});

export const GET = withAuth(async (_req, session, context) => {
  try {
    const params = routeParamsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ message: 'Invalid file id' }, { status: 400 });
    }

    const downloaded = await StorageService.getDownloadPayload({
      userId: session.user.id,
      fileId: params.data.fileId,
    });

    const body = downloaded.bytes.buffer.slice(
      downloaded.bytes.byteOffset,
      downloaded.bytes.byteOffset + downloaded.bytes.byteLength
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        'Content-Type': downloaded.contentType,
        'Content-Disposition': `attachment; filename="${downloaded.fileName}"`,
      },
    });
  } catch (error: any) {
    if (error?.message === 'File not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
