import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { UserService } from '@/services/UserService';

export const GET = withAuth([], async (_req, sessionData) => {
  try {
    if (!sessionData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const userAgent = sessionData.session.userAgent;

    const securityInfo = await UserService.getSecurityInfo(userId, userAgent);
    return NextResponse.json(securityInfo);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
