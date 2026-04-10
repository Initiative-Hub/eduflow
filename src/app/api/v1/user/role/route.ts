import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withNoRole, withValidation } from '@/server/middlewares';
import { UserService } from '@/services/UserService';

const updateRoleSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER']),
});

export const PUT = withAuth(
  [],
  withNoRole(
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
  )
);
