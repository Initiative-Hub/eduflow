'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import {
  ADMIN_USERS_QUERY_KEY,
  type AdminUser,
  type AdminUserCreateInput,
  type AdminUserEditForm,
  type AdminUserMutationResponse,
  type AdminUserUpdateInput,
  filterAdminUsers,
  getAdminUserInitials,
  PAGE_SIZE_OPTIONS,
  ROLE_OPTIONS,
} from './users.config';
import { usersService } from './users.service';

type RoleBadgeView = {
  label: string;
  variant?:
    | 'link'
    | 'default'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'ghost'
    | null;
};

type StatusBadgeView = {
  label: string;
  variant?: RoleBadgeView['variant'];
};

const INITIAL_ADD_FORM: AdminUserCreateInput = {
  email: '',
  password: '',
  name: '',
  role: 'STUDENT',
};

const INITIAL_EDIT_FORM: AdminUserEditForm = {
  name: '',
  email: '',
  role: 'STUDENT',
};

export function useUsers() {
  const t = useTranslations('AdminUsersPage');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<AdminUserEditForm>(INITIAL_EDIT_FORM);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUserForm, setNewUserForm] =
    useState<AdminUserCreateInput>(INITIAL_ADD_FORM);
  const [addError, setAddError] = useState('');

  const usersQuery = useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: usersService.list,
  });

  const resetAddDialog = () => {
    setNewUserForm(INITIAL_ADD_FORM);
    setAddError('');
  };

  const updateUserMutation = useMutation<
    AdminUserMutationResponse,
    ApiError,
    AdminUserUpdateInput
  >({
    mutationFn: usersService.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      setEditingId(null);
      toast.success(t('toast.updated'));
    },
    onError: (error) => {
      toast.error(error.message || t('toast.updateFailed'));
    },
  });

  const createUserMutation = useMutation<
    AdminUserMutationResponse,
    ApiError,
    AdminUserCreateInput
  >({
    mutationFn: usersService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      setAddDialogOpen(false);
      resetAddDialog();
      toast.success(t('toast.created'));
    },
    onError: (error) => {
      setAddError(error.message || t('toast.createFailed'));
    },
  });

  const users = usersQuery.data ?? [];
  const filteredUsers = filterAdminUsers(users, query, roleFilter);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / itemsPerPage)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  const visibleStart =
    filteredUsers.length === 0
      ? 0
      : Math.min(startIndex + 1, filteredUsers.length);
  const visibleEnd = Math.min(startIndex + itemsPerPage, filteredUsers.length);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value, 10));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage(safeCurrentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage(safeCurrentPage + 1);
    }
  };

  const openAddDialog = () => {
    setAddDialogOpen(true);
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      resetAddDialog();
    }
  };

  const updateNewUserForm = <Key extends keyof AdminUserCreateInput>(
    key: Key,
    value: AdminUserCreateInput[Key]
  ) => {
    setNewUserForm((current) => ({ ...current, [key]: value }));
  };

  const updateEditForm = <Key extends keyof AdminUserEditForm>(
    key: Key,
    value: AdminUserEditForm[Key]
  ) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const startEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role ?? 'STUDENT',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(INITIAL_EDIT_FORM);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateUserMutation.mutate({ id: editingId, ...editForm });
  };

  const createUser = () => {
    setAddError('');

    if (!newUserForm.email || !newUserForm.password) {
      setAddError(t('validation.emailPasswordRequired'));
      return;
    }

    createUserMutation.mutate(newUserForm);
  };

  const getRoleBadge = (role?: string): RoleBadgeView => {
    if (role === 'ADMIN') {
      return { label: t('roles.admin'), variant: 'default' };
    }

    if (role === 'TEACHER') {
      return { label: t('roles.teacher'), variant: 'secondary' };
    }

    if (role === 'STUDENT') {
      return { label: t('roles.student'), variant: 'outline' };
    }

    return { label: t('roles.unknown'), variant: 'ghost' };
  };

  const getStatusBadge = (emailVerified: boolean): StatusBadgeView => {
    if (emailVerified) {
      return { label: t('status.verified'), variant: 'default' };
    }

    return { label: t('status.unverified'), variant: 'outline' };
  };

  const getJoinDate = (createdAt: string) => {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(new Date(createdAt));
  };

  return {
    t,
    roleOptions: ROLE_OPTIONS,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    query,
    roleFilter,
    itemsPerPage,
    editingId,
    editForm,
    addDialogOpen,
    newUserForm,
    addError,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    filteredUsers,
    paginatedUsers,
    totalPages,
    safeCurrentPage,
    visibleStart,
    visibleEnd,
    getInitials: getAdminUserInitials,
    getRoleBadge,
    getStatusBadge,
    getJoinDate,
    openAddDialog,
    handleAddDialogOpenChange,
    handleQueryChange,
    handleRoleFilterChange,
    handleItemsPerPageChange,
    handlePreviousPage,
    handleNextPage,
    updateNewUserForm,
    updateEditForm,
    startEdit,
    cancelEdit,
    saveEdit,
    createUser,
  };
}
