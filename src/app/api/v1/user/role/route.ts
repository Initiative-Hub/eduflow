import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { UserService } from '@/services/UserService';

const updateRoleSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER']),
});

/**
 * @swagger
 * /api/v1/user/role:
 *   put:
 *     tags:
 *       - User
 *     summary: Update the current user's platform role
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [STUDENT, TEACHER]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *
 */
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json();
  const parsedBody = updateRoleSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { role } = parsedBody.data;

  try {
    const updatedUser = await UserService.updateRole(user.id, role);

    return NextResponse.json({
      message: 'Role updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role?.name,
      },
    });
  } catch (error: any) {
    console.error('Role Update Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
});
