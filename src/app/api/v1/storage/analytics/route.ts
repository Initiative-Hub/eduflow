import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

export const GET = withAuth(async (_req, session) => {
  try {
    const analytics = await StorageService.getAnalytics({
      userId: session.user.id,
    });

    return NextResponse.json({ data: analytics });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
