import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveIntegrationService } from '@/services/GoogleDriveIntegrationService';

export const DELETE = withAuth(async (_req, session) => {
  try {
    await GoogleDriveIntegrationService.disconnect(session.user.id);

    return NextResponse.json({ data: { disconnected: true } });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not disconnect Google Drive.' },
      { status: 500 }
    );
  }
});
