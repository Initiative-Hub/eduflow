'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Link2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { aiChatShareClient } from '@/lib/api/ai-chat-share-client';
import type { ApiError } from '@/lib/api/types';
import { SharedLinksPagination } from './shared-links-pagination';
import { SharedLinksTable } from './shared-links-table';

const PAGE_SIZE = 10;
const queryKey = ['shared-links'] as const;

export function SharedLinksClient() {
  const t = useTranslations('AiShareLinks');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const sharesQuery = useQuery({
    queryKey: [...queryKey, page],
    placeholderData: keepPreviousData,
    queryFn: () => aiChatShareClient.listShares({ page, pageSize: PAGE_SIZE }),
  });

  const revokeMutation = useMutation({
    mutationFn: aiChatShareClient.revokeShare,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(t('toast.revoked'));
    },
    onError: (error: ApiError) => {
      toast.error(error.message || t('toast.revokeFailed'));
    },
  });

  const copyLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('toast.copied'));
    } catch {
      toast.error(t('toast.copyFailed'));
    }
  };

  const shares = sharesQuery.data?.data ?? [];
  const pagination = sharesQuery.data?.pagination;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/95 p-0 shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-border/60 border-b bg-muted/15 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-primary shadow-xs">
            <Link2 className="size-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl">
              {t('cardTitle')}
            </CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              {t('cardDescription')}
            </CardDescription>
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-muted-foreground text-xs shadow-xs sm:self-auto">
          <ShieldCheck className="size-3.5 text-primary" />
          {t('summary.active', { count: pagination?.total ?? 0 })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {sharesQuery.isError ? (
          <p className="m-5 rounded-lg border border-destructive/30 p-4 text-destructive text-sm">
            {t('error')}
          </p>
        ) : sharesQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-16 w-full" key={index} />
            ))}
          </div>
        ) : shares.length === 0 ? (
          <Empty className="m-5 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Link2 />
              </EmptyMedia>
              <EmptyTitle>{t('empty.title')}</EmptyTitle>
              <EmptyDescription>{t('empty.description')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <SharedLinksTable
              isRevoking={revokeMutation.isPending}
              onCopy={copyLink}
              onRevoke={revokeMutation.mutate}
              shares={shares}
            />
            {pagination ? (
              <SharedLinksPagination
                isPending={sharesQuery.isFetching}
                onPageChange={setPage}
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
