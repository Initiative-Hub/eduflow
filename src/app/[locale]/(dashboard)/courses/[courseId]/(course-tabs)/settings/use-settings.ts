'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import type { ApiError } from '@/lib/api';
import {
  COURSE_SETTINGS_QUERY_KEY,
  type CourseSettingsDraft,
  type CourseSettingsResponse,
  type CourseSettingsRole,
  type CourseVisibility,
  getCourseSettingsDraft,
} from './settings.config';
import { courseSettingsService } from './settings.service';

function getErrorMessage(error: ApiError, fallback: string) {
  return error.message || fallback;
}

export function useCourseSettings({
  courseId,
  initialSettings,
}: {
  courseId: string;
  initialSettings: CourseSettingsResponse;
}) {
  const t = useTranslations('CourseSettingsPage');
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = COURSE_SETTINGS_QUERY_KEY(courseId);
  const [isNavigating, startTransition] = useTransition();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CourseSettingsDraft>(() =>
    getCourseSettingsDraft(initialSettings)
  );
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferMemberId, setTransferMemberId] = useState('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveConfirmation, setArchiveConfirmation] = useState('');
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const settingsQuery = useQuery({
    queryKey,
    queryFn: () => courseSettingsService.getOverview(courseId),
    initialData: initialSettings,
  });
  const settings = settingsQuery.data;

  const updateOverviewMutation = useMutation({
    mutationFn: () =>
      courseSettingsService.updateOverview(courseId, {
        capacity:
          draft.capacityMode === 'unlimited'
            ? null
            : Number.parseInt(draft.capacity, 10),
        description: draft.description.trim() || null,
        isPublished: draft.visibility === 'public',
        title: draft.title.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setIsEditing(false);
      toast.success(t('toast.updated'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.updateFailed')));
    },
  });

  const leaveCourseMutation = useMutation({
    mutationFn: () => courseSettingsService.leaveCourse(courseId),
    onSuccess: () => {
      setLeaveDialogOpen(false);
      toast.success(t('toast.left'));
      startTransition(() => {
        router.push('/courses');
      });
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.leaveFailed')));
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: () =>
      courseSettingsService.transferOwnership(courseId, transferMemberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setTransferDialogOpen(false);
      setTransferMemberId('');
      toast.success(t('toast.transferred'));
      router.refresh();
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.transferFailed')));
    },
  });

  const archiveCourseMutation = useMutation({
    mutationFn: () =>
      courseSettingsService.archiveCourse(courseId, archiveConfirmation.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setArchiveDialogOpen(false);
      setArchiveConfirmation('');
      toast.success(t('toast.archived'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.archiveFailed')));
    },
  });

  const unarchiveCourseMutation = useMutation({
    mutationFn: () => courseSettingsService.unarchiveCourse(courseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setUnarchiveDialogOpen(false);
      toast.success(t('toast.unarchived'));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.unarchiveFailed')));
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () =>
      courseSettingsService.deleteCourse(courseId, deleteConfirmation.trim()),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setDeleteConfirmation('');
      toast.success(t('toast.deleted'));
      startTransition(() => {
        router.push('/courses');
      });
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.deleteFailed')));
    },
  });

  const updateDraft = (updates: Partial<CourseSettingsDraft>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...updates }));
  };

  const startEditing = () => {
    setDraft(getCourseSettingsDraft(settings));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(getCourseSettingsDraft(settings));
    setIsEditing(false);
  };

  const saveOverview = () => {
    if (
      !settings.currentUser.isOwner ||
      draft.title.trim().length === 0 ||
      capacityValidationMessage
    ) {
      return;
    }

    updateOverviewMutation.mutate();
  };

  const openArchiveDialog = () => {
    setArchiveConfirmation('');
    setArchiveDialogOpen(true);
  };

  const openDeleteDialog = () => {
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  const getRoleLabel = (role: CourseSettingsRole) => {
    if (role === 'COURSE_OWNER') {
      return t('roles.courseOwner');
    }

    if (role === 'TEACHER') {
      return t('roles.teacher');
    }

    return t('roles.student');
  };

  const getVisibilityLabel = (visibility: CourseVisibility) => {
    return visibility === 'public'
      ? t('visibility.public')
      : t('visibility.private');
  };

  const getCapacityLabel = (capacity: number | null) => {
    return capacity === null
      ? t('capacity.unlimited')
      : t('capacity.limitedValue', { count: capacity });
  };

  const parsedCapacity =
    draft.capacityMode === 'limited'
      ? Number.parseInt(draft.capacity, 10)
      : null;
  const capacityValidationMessage =
    draft.capacityMode === 'limited' &&
    (!Number.isFinite(parsedCapacity) ||
      parsedCapacity === null ||
      parsedCapacity < 1)
      ? t('capacity.validation.required')
      : draft.capacityMode === 'limited' &&
          parsedCapacity !== null &&
          parsedCapacity < settings.course.activeMemberCount
        ? t('capacity.validation.belowActive', {
            count: settings.course.activeMemberCount,
          })
        : null;
  const selectedTransferMember = settings.transferMembers.find(
    (member) => member.id === transferMemberId
  );

  return {
    archiveConfirmation,
    archiveDialogOpen,
    canArchive: archiveConfirmation.trim() === settings.course.id,
    canDelete: deleteConfirmation.trim() === settings.course.id,
    canSaveOverview:
      settings.currentUser.isOwner &&
      draft.title.trim().length > 0 &&
      !capacityValidationMessage &&
      !updateOverviewMutation.isPending,
    cancelEditing,
    deleteConfirmation,
    deleteDialogOpen,
    draft,
    getRoleLabel,
    getCapacityLabel,
    getVisibilityLabel,
    capacityValidationMessage,
    isArchiving: archiveCourseMutation.isPending,
    isDeleting: deleteCourseMutation.isPending || isNavigating,
    isEditing,
    isError: settingsQuery.isError,
    isLeaving: leaveCourseMutation.isPending || isNavigating,
    isSavingOverview: updateOverviewMutation.isPending,
    isTransferring: transferOwnershipMutation.isPending,
    isUnarchiving: unarchiveCourseMutation.isPending,
    leaveDialogOpen,
    openArchiveDialog,
    openDeleteDialog,
    saveOverview,
    selectedTransferMember,
    setArchiveConfirmation,
    setArchiveDialogOpen,
    setDeleteConfirmation,
    setDeleteDialogOpen,
    setLeaveDialogOpen,
    setTransferDialogOpen,
    setTransferMemberId,
    setUnarchiveDialogOpen,
    settings,
    startEditing,
    t,
    transferDialogOpen,
    transferMemberId,
    unarchiveDialogOpen,
    updateDraft,
    archiveCourse: archiveCourseMutation.mutate,
    deleteCourse: deleteCourseMutation.mutate,
    leaveCourse: leaveCourseMutation.mutate,
    transferOwnership: transferOwnershipMutation.mutate,
    unarchiveCourse: unarchiveCourseMutation.mutate,
  };
}

export type UseCourseSettingsState = ReturnType<typeof useCourseSettings>;
