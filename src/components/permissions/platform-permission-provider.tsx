'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { PlatformPermissionKey } from '@/lib/permissions/permission-keys';
import {
  EMPTY_PLATFORM_PERMISSION_STATE,
  type PlatformPermissionState,
} from '@/lib/permissions/platform-permission-state';

type PlatformPermissionContextValue = PlatformPermissionState & {
  has: (permission: PlatformPermissionKey) => boolean;
  hasAny: (permissions: readonly PlatformPermissionKey[]) => boolean;
};

const PlatformPermissionContext =
  createContext<PlatformPermissionContextValue | null>(null);

export function PlatformPermissionProvider({
  children,
  state,
}: {
  children: ReactNode;
  state: PlatformPermissionState;
}) {
  const value = useMemo<PlatformPermissionContextValue>(
    () => ({
      ...state,
      has: (permission) => state.permissions.includes(permission),
      hasAny: (permissions) =>
        permissions.some((permission) =>
          state.permissions.includes(permission)
        ),
    }),
    [state]
  );

  return (
    <PlatformPermissionContext.Provider value={value}>
      {children}
    </PlatformPermissionContext.Provider>
  );
}

export function usePlatformPermissions() {
  return (
    useContext(PlatformPermissionContext) ?? {
      ...EMPTY_PLATFORM_PERMISSION_STATE,
      has: () => false,
      hasAny: () => false,
    }
  );
}
