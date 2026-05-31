import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoles } from '@/lib/api/middlewares';
import {
  isPlatformPermissionKey,
  type PlatformPermissionKey,
} from '@/lib/permissions/permission-keys';
import { PlatformRolePermissionService } from '@/services/PlatformRolePermissionService';

const platformPermissionSchema = z
  .string()
  .refine(isPlatformPermissionKey, 'Invalid platform permission key')
  .transform((value) => value as PlatformPermissionKey);

const updatePermissionSchema = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
  permission: platformPermissionSchema,
  enabled: z.boolean(),
});

/**
 * @swagger
 * /api/admin/roles/permissions:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List platform role permissions
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Platform role permission states
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const GET = withRoles(['ADMIN'], async () => {
  try {
    const roles =
      await PlatformRolePermissionService.getPlatformRolePermissionStates();

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('List role permissions error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});

/**
 * @swagger
 * /api/admin/roles/permissions:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Update one platform role permission
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Platform role permission updated
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const PATCH = withRoles(['ADMIN'], async (req) => {
  try {
    const parsed = updatePermissionSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const permission =
      await PlatformRolePermissionService.updatePlatformRolePermission(
        parsed.data
      );

    return NextResponse.json({
      role: parsed.data.role,
      permission: permission.permission,
      enabled: permission.enabled,
    });
  } catch (error) {
    console.error('Update role permission error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});
