import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';

export const GET = withAuth(async (_req, session) => {
  try {
    const status = await GoogleDriveDestinationService.getStatus(
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
