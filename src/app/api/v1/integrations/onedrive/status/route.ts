import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';

export const GET = withAuth(async (_req, session) => {
  try {
    const status = await OneDriveDestinationService.getStatus(session.user.id);

    return NextResponse.json({ data: status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Could not load OneDrive status.' },
      { status: 500 }
    );
  }
});
