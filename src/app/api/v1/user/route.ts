/**
 * @swagger
 * /api/v1/user:
 *   get:
 *     tags:
 *       - User
 *     summary: Get current user profile
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *   post:
 *     tags:
 *       - User
 *     summary: Create a user (admin only)
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Stub response
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
import { NextResponse } from 'next/server';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { UserService } from '@/services/UserService';

export const GET = withAuth(async (_req, session) => {
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

export const POST = withRoles(['ADMIN'], async (_req) => {
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

export const PATCH = withAuth(async (req, session) => {
  try {
    const userId = session?.user?.id as string;
    const body = await req.json();

    const updatedUser = await UserService.updateBasicInfo(userId, {
      name: body.name,
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
