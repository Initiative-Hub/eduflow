import {
  PLATFORM_PERMISSION_KEYS,
  type PlatformPermissionKey,
} from './permission-keys';

export type PlatformPermissionState = {
  isAuthenticated: boolean;
  permissions: PlatformPermissionKey[];
};

export const EMPTY_PLATFORM_PERMISSION_STATE: PlatformPermissionState = {
  isAuthenticated: false,
  permissions: [],
};

export function createPlatformPermissionState(
  permissions: readonly string[],
  isAuthenticated = true
): PlatformPermissionState {
  const validPermissions = new Set(PLATFORM_PERMISSION_KEYS);

  return {
    isAuthenticated,
    permissions: permissions.filter(
      (permission): permission is PlatformPermissionKey =>
        validPermissions.has(permission as PlatformPermissionKey)
    ),
  };
}
