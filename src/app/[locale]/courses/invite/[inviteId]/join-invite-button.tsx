'use client';

import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { type ApiError, apiClient } from '@/lib/api';

type JoinInviteButtonProps = {
  disabled: boolean;
  inviteId: string;
};

type JoinInviteResponse = {
  courseId: string;
  message: string;
};

export function JoinInviteButton({
  disabled,
  inviteId,
}: JoinInviteButtonProps) {
  const router = useRouter();
  const t = useTranslations('CourseInvitePage');
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post<JoinInviteResponse>(
        `v1/course-invite-links/${inviteId}/join`,
        {}
      ),
    onSuccess: (result) => {
      toast.success(t('toast.joined'));
      router.push(`/courses/${result.courseId}`);
      router.refresh();
    },
    onError: (error: ApiError) => {
      toast.error(
        error.message === 'Course capacity reached'
          ? t('toast.capacityFull')
          : error.message || t('toast.failed')
      );
    },
  });

  return (
    <Button
      type="button"
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <LogIn data-icon="inline-start" />
      )}
      {t('joinButton')}
    </Button>
  );
}
