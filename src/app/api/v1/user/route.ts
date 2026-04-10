import { NextResponse } from 'next/server';
import { withAuth } from '@/server/middlewares';

export const GET = withAuth(['ADMIN'], async (req) => {
  try {
    return NextResponse.json({
      message: 'Get all users stub',
      data: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(['ADMIN'], async (req) => {
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
