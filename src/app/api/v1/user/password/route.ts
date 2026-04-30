import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { UserService } from '@/services/UserService';

/**
 * @swagger
 * /api/v1/user/password:
 *   post:
 *     tags:
 *       - User
 *     summary: Set password for the current user
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password set successfully
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const POST = withAuth(async (req, session) => {
  try {
    const { password } = await req.json();

    await UserService.setPassword(
      password,
      { name: session.user.name, email: session.user.email },
      await headers()
    );

    return NextResponse.json({ message: 'Password set successfully.' });
  } catch (error: any) {
    console.error('Set Password Error:', error);

    // Handle errors (including those thrown by UserService or Better Auth)
    if (error.body?.message || error.message) {
      const status = error.statusCode || error.status || 400;
      return NextResponse.json(
        { message: error.body?.message || error.message },
        { status: status >= 400 && status < 600 ? status : 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
