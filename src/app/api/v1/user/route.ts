import { NextResponse } from 'next/server';
import { withAuth } from '@/server/middlewares';
import { UserService } from '@/services/UserService';

export const GET = withAuth([], async (_req, session) => {
  try {
    const userId = session?.user?.id as string;

    const out = await UserService.getBasicInfo(userId);
    return NextResponse.json(out);
  } catch (error: any) {
    if (error?.message === 'User not found') {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(['ADMIN'], async (_req) => {
  try {
    return NextResponse.json({
      message: 'Create user stub',
      data: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
