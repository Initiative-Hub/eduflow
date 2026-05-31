'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import {
  ROLE_PERMISSION_QUERY_KEY,
  type RolePermissionsResponse,
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
          permissionState.permission === input.permission
            ? { ...permissionState, enabled: input.enabled }
            : permissionState
        ),
      };
    }),
  };
}

export function useRoles() {
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ROLE_PERMISSION_QUERY_KEY,
    queryFn: rolesService.getPermissions,
  });

  const updatePermissionMutation = useMutation<
    unknown,
    ApiError,
    UpdateRolePermissionInput,
    { previousData?: RolePermissionsResponse }
  >({
    mutationFn: rolesService.updatePermission,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ROLE_PERMISSION_QUERY_KEY });

      const previousData = queryClient.getQueryData<RolePermissionsResponse>(
        ROLE_PERMISSION_QUERY_KEY
      );

      queryClient.setQueryData<RolePermissionsResponse>(
        ROLE_PERMISSION_QUERY_KEY,
        (currentData) => updateCachedPermission(currentData, input)
      );

      return { previousData };
    },
    onError: (error, _input, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ROLE_PERMISSION_QUERY_KEY,
          context.previousData
        );
      }

      toast.error(error.message || 'Failed to update role permission.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_PERMISSION_QUERY_KEY });
    },
  });

  return {
    roles: permissionsQuery.data?.roles ?? [],
    isLoading: permissionsQuery.isLoading,
    isError: permissionsQuery.isError,
    updatePermission: updatePermissionMutation.mutate,
    isUpdating: updatePermissionMutation.isPending,
  };
}
