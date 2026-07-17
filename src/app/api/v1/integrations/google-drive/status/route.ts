import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveIntegrationService } from '@/services/GoogleDriveIntegrationService';

export const GET = withAuth(async (_req, session) => {
  try {
    const status = await GoogleDriveIntegrationService.getStatus(
      session.user.id
    );

    return NextResponse.json({ data: status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not load Google Drive status.' },
      { status: 500 }
    );
  }
});
