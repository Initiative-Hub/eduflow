'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import {
  type AssignableCourseMemberRole,
  COURSE_INVITE_LINKS_QUERY_KEY,
  COURSE_MEMBER_CANDIDATE_PAGE_SIZE,
  COURSE_MEMBER_ROLE_OPTIONS,
  COURSE_MEMBER_SEARCH_DEBOUNCE_MS,
  COURSE_MEMBERS_PAGE_SIZE_OPTIONS,
  COURSE_MEMBERS_QUERY_KEY,
  type CourseMember,
  type CourseMemberRole,
  type CourseMemberRoleFilter,
  getCourseMemberInitials,
} from './members.config';
import { courseMembersService } from './members.service';

type RoleBadgeView = {
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
};

type EditDialogState = {
  member: CourseMember;
  role: AssignableCourseMemberRole;
} | null;

type InviteLinkDialogState = {
  expiresAt: string;
  maxUses: string;
  role: AssignableCourseMemberRole;
};

function getErrorMessage(error: ApiError, fallback: string) {
  return error.message || fallback;
}

export function useMembers({
  courseId,
  initialCanManageMembers,
}: {
  courseId: string;
  initialCanManageMembers: boolean;
}) {
  const t = useTranslations('CourseMembersPage');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const queryKey = COURSE_MEMBERS_QUERY_KEY(courseId);
  const inviteLinksQueryKey = COURSE_INVITE_LINKS_QUERY_KEY(courseId);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<CourseMemberRoleFilter>('ALL');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addRole, setAddRole] = useState<AssignableCourseMemberRole>('STUDENT');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [debouncedCandidateSearch, setDebouncedCandidateSearch] = useState('');
  const [editDialog, setEditDialog] = useState<EditDialogState>(null);
  const [removeDialog, setRemoveDialog] = useState<CourseMember | null>(null);
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false);
  const [inviteLinkForm, setInviteLinkForm] = useState<InviteLinkDialogState>({
    expiresAt: '',
    maxUses: '100',
    role: 'STUDENT',
  });
  const candidateSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, COURSE_MEMBER_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedCandidateSearch(candidateSearch.trim());
    }, COURSE_MEMBER_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [candidateSearch]);

  const membersQuery = useQuery({
    queryKey: [
      ...queryKey,
      'list',
      debouncedSearch,
      roleFilter,
      itemsPerPage,
      currentPage,
    ],
    queryFn: () =>
      courseMembersService.listMembers({
        courseId,
        search: debouncedSearch || undefined,
        role: roleFilter,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      }),
    placeholderData: keepPreviousData,
  });

  const inviteLinksQuery = useQuery({
    queryKey: inviteLinksQueryKey,
    enabled: initialCanManageMembers,
    queryFn: () => courseMembersService.listInviteLinks(courseId),
  });

  const canSearchCandidates = debouncedCandidateSearch.length >= 2;
  const candidateQuery = useInfiniteQuery({
    queryKey: [...queryKey, 'candidates', debouncedCandidateSearch],
    initialPageParam: 0,
    enabled: addDialogOpen && canSearchCandidates,
    queryFn: ({ pageParam }) =>
      courseMembersService.listCandidates({
        courseId,
        search: debouncedCandidateSearch,
        limit: COURSE_MEMBER_CANDIDATE_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.pagination.offset + lastPage.pagination.limit;
      return nextOffset < lastPage.pagination.total ? nextOffset : undefined;
    },
  });

  useEffect(() => {
    if (!addDialogOpen) return;

    const sentinel = candidateSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          entry?.isIntersecting &&
          candidateQuery.hasNextPage &&
          !candidateQuery.isFetchingNextPage
        ) {
          void candidateQuery.fetchNextPage();
        }
      },
      { rootMargin: '160px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    addDialogOpen,
    candidateQuery.fetchNextPage,
    candidateQuery.hasNextPage,
    candidateQuery.isFetchingNextPage,
  ]);

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      courseMembersService.addMember(courseId, { userId, role: addRole }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(t('toast.added'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.addFailed')));
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      courseMembersService.inviteMember(courseId, { userId, role: addRole }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(t('toast.invited'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.inviteFailed')));
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: AssignableCourseMemberRole;
    }) => courseMembersService.updateMember(courseId, { memberId, role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setEditDialog(null);
      toast.success(t('toast.updated'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.updateFailed')));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      courseMembersService.removeMember(courseId, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setRemoveDialog(null);
      toast.success(t('toast.removed'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.removeFailed')));
    },
  });

  const createInviteLinkMutation = useMutation({
    mutationFn: () =>
      courseMembersService.createInviteLink(courseId, {
        expiresAt: inviteLinkForm.expiresAt
          ? new Date(inviteLinkForm.expiresAt).toISOString()
          : undefined,
        maxUses: inviteLinkForm.maxUses
          ? Number.parseInt(inviteLinkForm.maxUses, 10)
          : undefined,
        role: inviteLinkForm.role,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteLinksQueryKey });
      setInviteLinkDialogOpen(false);
      setInviteLinkForm({ expiresAt: '', maxUses: '100', role: 'STUDENT' });
      toast.success(t('toast.linkCreated'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.linkCreateFailed')));
    },
  });

  const revokeInviteLinkMutation = useMutation({
    mutationFn: (inviteId: string) =>
      courseMembersService.revokeInviteLink(courseId, inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteLinksQueryKey });
      toast.success(t('toast.linkRevoked'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.linkRevokeFailed')));
    },
  });

  const members = membersQuery.data?.data ?? [];
  const pagination = membersQuery.data?.pagination;
  const totalMembers = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMembers / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleStart =
    totalMembers === 0
      ? 0
      : Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalMembers);
  const visibleEnd = Math.min(safeCurrentPage * itemsPerPage, totalMembers);
  const canManageMembers =
    membersQuery.data?.permissions.canManageMembers ?? initialCanManageMembers;
  const candidates = useMemo(
    () => candidateQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [candidateQuery.data]
  );
  const inviteLinks = inviteLinksQuery.data?.data ?? [];
  const capacity = membersQuery.data?.capacity ?? {
    activeMemberCount: totalMembers,
    capacity: null,
    isFull: false,
    remaining: null,
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value as CourseMemberRoleFilter);
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

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);

    if (!open) {
      setCandidateSearch('');
      setDebouncedCandidateSearch('');
      setAddRole('STUDENT');
    }
  };

  const openEditDialog = (member: CourseMember) => {
    if (member.user.role === 'COURSE_OWNER') return;

    setEditDialog({
      member,
      role: member.user.role as AssignableCourseMemberRole,
    });
  };

  const updateEditRole = (role: string) => {
    if (!editDialog) return;

    setEditDialog({
      ...editDialog,
      role: role as AssignableCourseMemberRole,
    });
  };

  const saveEditRole = () => {
    if (!editDialog) return;

    updateMemberMutation.mutate({
      memberId: editDialog.member.user.id,
      role: editDialog.role,
    });
  };

  const confirmRemoveMember = () => {
    if (!removeDialog) return;
    removeMemberMutation.mutate(removeDialog.user.id);
  };

  const updateInviteLinkForm = (
    key: keyof InviteLinkDialogState,
    value: string
  ) => {
    setInviteLinkForm((current) => ({ ...current, [key]: value }));
  };

  const getRoleBadge = (role: CourseMemberRole): RoleBadgeView => {
    if (role === 'COURSE_OWNER') {
      return { label: t('roles.courseOwner'), variant: 'default' };
    }

    if (role === 'TEACHER') {
      return { label: t('roles.teacher'), variant: 'secondary' };
    }

    return { label: t('roles.student'), variant: 'outline' };
  };

  const getRoleLabel = (role: CourseMemberRoleFilter) => {
    if (role === 'ALL') {
      return t('roles.all');
    }

    return getRoleBadge(role).label;
  };

  const getStatusBadge = (status: CourseMember['status']): RoleBadgeView => {
    if (status === 'PENDING_INVITE') {
      return { label: t('status.pendingInvite'), variant: 'outline' };
    }

    return { label: t('status.active'), variant: 'secondary' };
  };

  const getJoinDate = (enrolledAt: string | null) => {
    if (!enrolledAt) {
      return t('fallback.noJoinDate');
    }

    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(new Date(enrolledAt));
  };

  return {
    addDialogOpen,
    addMember: addMemberMutation.mutate,
    addPending: addMemberMutation.isPending,
    addRole,
    assignableRoles: ['TEACHER', 'STUDENT'] as AssignableCourseMemberRole[],
    canManageMembers,
    capacity,
    candidateSearch,
    candidateSentinelRef,
    candidates,
    confirmRemoveMember,
    createInviteLink: createInviteLinkMutation.mutate,
    editDialog,
    getInitials: getCourseMemberInitials,
    getJoinDate,
    getRoleBadge,
    getRoleLabel,
    getStatusBadge,
    inviteLinks,
    inviteLinkDialogOpen,
    inviteLinkForm,
    inviteMember: inviteMemberMutation.mutate,
    invitePending: inviteMemberMutation.isPending,
    handleAddDialogOpenChange,
    handleItemsPerPageChange,
    handleNextPage,
    handlePreviousPage,
    handleRoleFilterChange,
    handleSearchChange,
    isCandidatesError: candidateQuery.isError,
    isCandidatesLoading: candidateQuery.isLoading,
    isCreatingInviteLink: createInviteLinkMutation.isPending,
    isError: membersQuery.isError,
    isFetchingCandidatesNextPage: candidateQuery.isFetchingNextPage,
    isLoading: membersQuery.isLoading,
    isInviteLinksError: inviteLinksQuery.isError,
    isInviteLinksLoading: inviteLinksQuery.isLoading,
    isRemoving: removeMemberMutation.isPending,
    isRevokingInviteLink: revokeInviteLinkMutation.isPending,
    isUpdating: updateMemberMutation.isPending,
    itemsPerPage,
    members,
    openEditDialog,
    pageSizeOptions: COURSE_MEMBERS_PAGE_SIZE_OPTIONS,
    removeDialog,
    revokeInviteLink: revokeInviteLinkMutation.mutate,
    roleFilter,
    roleOptions: COURSE_MEMBER_ROLE_OPTIONS,
    safeCurrentPage,
    saveEditRole,
    search,
    setAddDialogOpen,
    setAddRole,
    setCandidateSearch,
    setEditDialog,
    setInviteLinkDialogOpen,
    setInviteLinkForm,
    setRemoveDialog,
    t,
    totalMembers,
    totalPages,
    updateInviteLinkForm,
    updateEditRole,
    visibleEnd,
    visibleStart,
  };
}

export type UseMembersState = ReturnType<typeof useMembers>;
