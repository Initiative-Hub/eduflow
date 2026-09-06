'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import {
  ROLE_PERMISSION_QUERY_KEY,
  type RolePermissionsResponse,
  type RolePermissionUpdateResponse,
  type UpdateRolePermissionInput,
} from './roles.config';
import { rolesService } from './roles.service';

function updateCachedPermission(
  data: RolePermissionsResponse | undefined,
  input: UpdateRolePermissionInput
) {
  if (!data) {
    return data;
  }

  return {
    roles: data.roles.map((roleState) => {
      if (roleState.role !== input.role) {
        return roleState;
      }

      return {
        ...roleState,
        permissions: roleState.permissions.map((permissionState) =>
          input.permissions.some(
            (permission) => permission.permission === permissionState.permission
          )
            ? {
                ...permissionState,
                enabled:
                  input.permissions.find(
                    (permission) =>
                      permission.permission === permissionState.permission
                  )?.enabled ?? permissionState.enabled,
              }
            : permissionState
        ),
      };
    }),
  };
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ROLE_PERMISSION_QUERY_KEY,
    queryFn: rolesService.getPermissions,
  });

  const updatePermissionMutation = useMutation<
    RolePermissionUpdateResponse,
    ApiError,
    UpdateRolePermissionInput
  >({
    mutationFn: rolesService.updatePermissions,
    onSuccess: (_result, input) => {
      queryClient.setQueryData<RolePermissionsResponse>(
        ROLE_PERMISSION_QUERY_KEY,
        (currentData) => updateCachedPermission(currentData, input)
      );

      queryClient.invalidateQueries({ queryKey: ROLE_PERMISSION_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update role permission.');
    },
  });

  return {
    roles: data?.roles ?? [],
    isLoading,
    isError,
    savePermissions: updatePermissionMutation.mutateAsync,
    isUpdating: updatePermissionMutation.isPending,
  };
}
