import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withValidation } from '@/lib/api/middlewares';
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
export const PUT = withAuth(
  withValidation(updateRoleSchema, async (_req, parsedBody, { user }) => {
    try {
      const updatedUser = await UserService.updateRole(
        user.id,
        parsedBody.role
      );

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
  })
);
