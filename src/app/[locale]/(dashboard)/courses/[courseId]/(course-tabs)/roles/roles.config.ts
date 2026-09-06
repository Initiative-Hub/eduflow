import { Crown, GraduationCap, User } from 'lucide-react';
import { z } from 'zod';
import type { CourseRoleName } from '@/generated/prisma';
import {
  COURSE_PERMISSION_CATEGORIES,
  type PermissionDefinition,
} from '@/lib/permissions/permission-categories';
import {
  type CoursePermissionKey,
  isCoursePermissionKey,
} from '@/lib/permissions/permission-keys';

export const ROLE_TABS = [
  { value: 'COURSE_OWNER', label: 'Course Owner', icon: Crown },
  { value: 'TEACHER', label: 'Teacher', icon: GraduationCap },
  { value: 'STUDENT', label: 'Student', icon: User },
] as const;

export const COURSE_ROLE_PERMISSION_QUERY_KEY = (courseId: string) =>
  ['course', courseId, 'roles', 'permissions'] as const;

export const ACCORDION_DEFAULT_VALUES = COURSE_PERMISSION_CATEGORIES.map(
  (category) => category.title
);

const coursePermissionSchema = z
  .string()
  .refine(isCoursePermissionKey, 'Invalid course permission key')
  .transform((value) => value as CoursePermissionKey);

export const updateCourseRolePermissionSchema = z.object({
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

export type UpdateCourseRolePermissionInput = z.infer<
  typeof updateCourseRolePermissionSchema
>;

export type CourseRolePermissionState = {
  role: CourseRoleName;
  permissions: Array<{
    permission: CoursePermissionKey;
    enabled: boolean;
  }>;
};

export type CourseRolePermissionsResponse = {
  roles: CourseRolePermissionState[];
};

export type CourseRolePermissionUpdateResponse = CourseRolePermissionState;

export type CoursePermissionDefinition = PermissionDefinition & {
  key: CoursePermissionKey;
  enabled: boolean;
};

export type CoursePermissionCategoryView = Omit<
  (typeof COURSE_PERMISSION_CATEGORIES)[number],
  'permissions'
> & {
  value: string;
  enabledCount: number;
  totalCount: number;
  permissions: CoursePermissionDefinition[];
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function containsSearch(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function getCoursePermissionCategoriesForRole(
  roleState: CourseRolePermissionState | undefined,
  searchQuery: string
): CoursePermissionCategoryView[] {
  const query = normalizeSearch(searchQuery);
  const enabledByPermission = new Map(
    roleState?.permissions.map(({ permission, enabled }) => [
      permission,
      enabled,
    ]) ?? []
  );

  return COURSE_PERMISSION_CATEGORIES.flatMap((category) => {
    const permissions = category.permissions
      .filter(
        (
          permission
        ): permission is PermissionDefinition & {
          key: CoursePermissionKey;
        } => isCoursePermissionKey(permission.key)
      )
      .map((permission) => ({
        ...permission,
        enabled: enabledByPermission.get(permission.key) ?? false,
      }));

    const categoryMatches =
      query.length > 0 &&
      containsSearch(`${category.title} ${category.description}`, query);
    const visiblePermissions =
      query.length === 0 || categoryMatches
        ? permissions
        : permissions.filter((permission) =>
            containsSearch(
              `${permission.title} ${permission.description} ${permission.key}`,
              query
            )
          );

    if (query.length > 0 && visiblePermissions.length === 0) {
      return [];
    }

    return [
      {
        ...category,
        value: category.title,
        enabledCount: permissions.filter((permission) => permission.enabled)
          .length,
        totalCount: permissions.length,
        permissions: visiblePermissions,
      },
    ];
  });
}
