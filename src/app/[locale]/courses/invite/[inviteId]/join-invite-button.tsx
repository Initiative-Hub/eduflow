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
  invitePath: string;
  isAuthenticated: boolean;
};

type JoinInviteResponse = {
  courseId: string;
  message: string;
};

export function JoinInviteButton({
  disabled,
  inviteId,
  invitePath,
  isAuthenticated,
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
    <div className="space-y-2">
      <Button
        type="button"
        disabled={disabled || mutation.isPending}
        onClick={() => {
          if (!isAuthenticated) {
            router.push(`/login?nextUrl=${encodeURIComponent(invitePath)}`);
            return;
          }

          mutation.mutate();
        }}
      >
        {mutation.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <LogIn data-icon="inline-start" />
        )}
        {isAuthenticated ? t('joinButton') : t('signInButton')}
      </Button>
    </div>
  );
}
