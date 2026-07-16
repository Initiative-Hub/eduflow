'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, Link2Off } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { aiChatShareClient } from '@/lib/api/ai-chat-share-client';
import type { ApiError } from '@/lib/api/types';
import { formatDateTime } from '@/utils/date';

const queryKey = ['shared-links'];

export function SharedLinksClient() {
  const t = useTranslations('AiShareLinks');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const resourceTypeLabels = {
    AI_CHAT: t('types.aiChat'),
    STUDY_INTERACTIVE_CONTENT: t('types.interactiveContent'),
  };

  const sharesQuery = useQuery({
    queryKey,
    queryFn: aiChatShareClient.listShares,
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

  return (
    <Card className="border-border/70 bg-card/90 p-0 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t('cardTitle')}</CardTitle>
        <CardDescription>{t('cardDescription')}</CardDescription>
      </CardHeader>

      <CardContent>
        {sharesQuery.isError ? (
          <p className="rounded-lg border border-destructive/30 p-4 text-destructive text-sm">
            {t('error')}
          </p>
        ) : sharesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : shares.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Link2 />
              </EmptyMedia>
              <EmptyTitle>{t('empty.title')}</EmptyTitle>
              <EmptyDescription>{t('empty.description')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t('table.conversation')}</TableHead>
                  <TableHead>{t('table.type')}</TableHead>
                  <TableHead>{t('table.created')}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t('table.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share.id}>
                    <TableCell className="max-w-80">
                      <a
                        className="block truncate font-medium hover:underline"
                        href={share.shareUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {share.title}
                      </a>
                      <p className="truncate font-mono text-muted-foreground text-xs">
                        {share.shareUrl}
                      </p>
                    </TableCell>
                    <TableCell>
                      {resourceTypeLabels[share.resourceType]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(share.createdAt, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => copyLink(share.shareUrl)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Copy />
                          <span className="sr-only">{t('actions.copy')}</span>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              disabled={revokeMutation.isPending}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <Link2Off />
                              <span className="sr-only">
                                {t('actions.revoke')}
                              </span>
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t('revokeDialog.title')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('revokeDialog.description')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                disabled={revokeMutation.isPending}
                              >
                                {t('actions.cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                disabled={revokeMutation.isPending}
                                onClick={() => revokeMutation.mutate(share.id)}
                                variant="destructive"
                              >
                                <Link2Off data-icon="inline-start" />
                                {t('actions.revoke')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
