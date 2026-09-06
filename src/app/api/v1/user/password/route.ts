import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { passwordField } from '@/lib/validations/common.schema';
import { UserService } from '@/services/UserService';

const setPasswordPayloadSchema = z.object({
  password: passwordField,
});

const changePasswordPayloadSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordField,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

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
    const body = await req.json();
    const parsed = setPasswordPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? 'Invalid request payload',
        },
        { status: 400 }
      );
    }
    const { password } = parsed.data;

    await UserService.setPassword(
      password,
      { name: session.user.name, email: session.user.email },
      await headers()
    );

    return NextResponse.json({ message: 'Password set successfully.' });
  } catch (error: any) {
    console.error('Set Password Error:', error);

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

/**
 * @swagger
 * /api/v1/user/password:
 *   put:
 *     tags:
 *       - User
 *     summary: Change password for the current user
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid request payload or incorrect current password
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const PUT = withAuth(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = changePasswordPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues[0]?.message ?? 'Invalid request payload',
        },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    await UserService.changePassword(
      currentPassword,
      newPassword,
      { name: session.user.name, email: session.user.email },
      await headers()
    );

    return NextResponse.json({ message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('Change Password Error:', error);

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
