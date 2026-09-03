import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

export const DELETE = withAuth(async (_req, session) => {
  try {
    await OneDriveOAuthTokenService.disconnect(session.user.id);

    return NextResponse.json({ data: { disconnected: true } });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not disconnect OneDrive.' },
      { status: 500 }
    );
  }
});
