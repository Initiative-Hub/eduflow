import { z } from 'zod';
import {
  type PermissionDefinition,
  PLATFORM_PERMISSION_CATEGORIES,
} from '@/lib/permissions/permission-catalog';
import {
  isPlatformPermissionKey,
  type PlatformPermissionKey,
} from '@/lib/permissions/permission-keys';

export const ROLE_TABS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' },
] as const;

export type PlatformRoleName = (typeof ROLE_TABS)[number]['value'];

export const ROLE_PERMISSION_QUERY_KEY = [
  'admin',
  'roles',
  'permissions',
] as const;

export const ACCORDION_DEFAULT_VALUES = PLATFORM_PERMISSION_CATEGORIES.map(
  (category) => category.title
);

const platformPermissionSchema = z
  .string()
  .refine(isPlatformPermissionKey, 'Invalid platform permission key')
  .transform((value) => value as PlatformPermissionKey);

export const updateRolePermissionSchema = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
  permissions: z
    .array(
      z.object({
        permission: platformPermissionSchema,
        enabled: z.boolean(),
      })
    )
    .min(1),
});

export type UpdateRolePermissionInput = z.infer<
  typeof updateRolePermissionSchema
>;

export type RolePermissionState = {
  role: PlatformRoleName;
  permissions: Array<{
    permission: PlatformPermissionKey;
    enabled: boolean;
  }>;
};

export type RolePermissionsResponse = {
  roles: RolePermissionState[];
};

export type RolePermissionUpdateResponse = RolePermissionState;

export type PlatformPermissionDefinition = PermissionDefinition & {
  key: PlatformPermissionKey;
  enabled: boolean;
};

export type PlatformPermissionCategoryView = Omit<
  (typeof PLATFORM_PERMISSION_CATEGORIES)[number],
  'permissions'
> & {
  value: string;
  enabledCount: number;
  totalCount: number;
  allPermissions: PlatformPermissionDefinition[];
  permissions: PlatformPermissionDefinition[];
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function containsSearch(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function getPlatformPermissionCategoriesForRole(
  roleState: RolePermissionState | undefined,
  searchQuery: string
): PlatformPermissionCategoryView[] {
  const query = normalizeSearch(searchQuery);
  const enabledByPermission = new Map(
    roleState?.permissions.map(({ permission, enabled }) => [
      permission,
      enabled,
    ]) ?? []
  );

  return PLATFORM_PERMISSION_CATEGORIES.flatMap((category) => {
    const permissions = category.permissions
      .filter(
        (
          permission
        ): permission is PermissionDefinition & {
          key: PlatformPermissionKey;
        } => isPlatformPermissionKey(permission.key)
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
        allPermissions: permissions,
        permissions: visiblePermissions,
      },
    ];
  });
}
