import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

export const GET = withAuth(async (_request, session, { params }) => {
  const parsed = z.object({ fileId: z.uuid() }).safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid file ID' }, { status: 400 });
  }

  try {
    const url = await AssignmentService.createFileDownloadUrl(
      parsed.data.fileId,
      session.user.id
    );

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 404 });
  }
});
