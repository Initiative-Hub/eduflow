'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import {
  COURSE_ROLE_PERMISSION_QUERY_KEY,
  type CourseRolePermissionsResponse,
  type CourseRolePermissionUpdateResponse,
  type UpdateCourseRolePermissionInput,
} from './roles.config';
import { rolesService } from './roles.service';

function updateCachedPermission(
  data: CourseRolePermissionsResponse | undefined,
  input: UpdateCourseRolePermissionInput
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
        permissions: roleState.permissions.map((permissionState) => {
          const updatedPermission = input.permissions.find(
            (permission) => permission.permission === permissionState.permission
          );

          if (!updatedPermission) {
            return permissionState;
          }

          return {
            ...permissionState,
            enabled: updatedPermission.enabled,
          };
        }),
      };
    }),
  };
}

export function useRoles(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = COURSE_ROLE_PERMISSION_QUERY_KEY(courseId);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => rolesService.getPermissions(courseId),
  });

  const updatePermissionMutation = useMutation<
    CourseRolePermissionUpdateResponse,
    ApiError,
    UpdateCourseRolePermissionInput
  >({
    mutationFn: (input) => rolesService.updatePermissions(courseId, input),
    onSuccess: (_result, input) => {
      queryClient.setQueryData<CourseRolePermissionsResponse>(
        queryKey,
        (currentData) => updateCachedPermission(currentData, input)
      );
      queryClient.invalidateQueries({ queryKey });
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
