import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';

export const DELETE = withAuth(async (_req, session) => {
  try {
    await GoogleDriveOAuthTokenService.disconnect(session.user.id);

    return NextResponse.json({ data: { disconnected: true } });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not disconnect Google Drive.' },
      { status: 500 }
    );
  }
});
