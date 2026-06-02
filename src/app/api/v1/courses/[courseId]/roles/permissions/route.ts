import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import {
  COURSE_PERMISSION,
  isCoursePermissionKey,
} from '@/lib/permissions/permission-keys';
import { CourseRolePermissionService } from '@/services/CourseRolePermissionService';

const coursePermissionSchema = z
  .string()
  .refine(isCoursePermissionKey, 'Invalid course permission key');

const updatePermissionSchema = z.object({
  role: z.enum(['COURSE_OWNER', 'TEACHER', 'STUDENT']),
  permissions: z
    .array(
      z.object({
        permission: coursePermissionSchema,
        enabled: z.boolean(),
      })
    )
    .min(1),
});

export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const currentUserId = sessionData.user.id;
    const permissions = await getCoursePermissions(currentUserId, courseId);

    if (
      permissions.withoutPermission(COURSE_PERMISSION.COURSE_SETTINGS_MANAGE)
    ) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const roles =
      await CourseRolePermissionService.getCourseRolePermissionStates(courseId);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('List course role permissions error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const currentUserId = sessionData.user.id;
    const permissionState = await getCoursePermissions(currentUserId, courseId);

    if (
      permissionState.withoutPermission(
        COURSE_PERMISSION.COURSE_SETTINGS_MANAGE
      )
    ) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const parsed = updatePermissionSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const permissions =
      await CourseRolePermissionService.updateCourseRolePermissions({
        courseId,
        role: parsed.data.role,
        permissions: parsed.data.permissions,
      });

    return NextResponse.json({
      role: parsed.data.role,
      permissions: permissions.map((permission) => ({
        permission: permission.permission,
        enabled: permission.enabled,
      })),
    });
  } catch (error) {
    console.error('Update course role permission error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});
